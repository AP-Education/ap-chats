import type { AttachmentDraft } from '../attachments/types';
import type { ComposedMessage, Message, MessageAuthor, SendMessageCommand } from '../types';
import { enqueue, type OutboxEntry, persistable, restore, unsent, update, without } from './outbox';

/** What the outbox needs from the conversation's upload queue. */
export interface OutboxUploads {
  subscribe: (listener: () => void) => () => void;
  getCommitted: (nonce: string) => AttachmentDraft[];
  releaseCommitted: (nonce: string) => void;
  remove: (key: string) => void;
  retry: (key: string) => void;
}

export interface OutboxStorage {
  read: () => unknown;
  write: (entries: readonly OutboxEntry[]) => void;
}

export interface ConversationOutboxPorts {
  uploads: OutboxUploads;
  storage: OutboxStorage;
  /** Posts the message; aborting the signal withdraws it while it is on its way. */
  post: (input: SendMessageCommand, signal: AbortSignal) => Promise<Message>;
  /** Brings an acknowledged message into the conversation's history. */
  arrive: (message: Message, author: MessageAuthor) => Promise<void>;
}

export interface OutboxSnapshot {
  entries: readonly OutboxEntry[];
  /** The live files of every entry still waiting on them, by nonce. */
  files: ReadonlyMap<string, AttachmentDraft[]>;
}

function speaksWithoutFiles(input: SendMessageCommand): boolean {
  return Boolean(input.markdown.trim()) || Boolean(input.blocks?.length);
}

function sentAttachments(drafts: AttachmentDraft[]) {
  return drafts.map((draft) => ({ ...draft.attachment!, description: draft.description || null }));
}

/**
 * One conversation's unsent messages. It outlives the conversation's screen, so a message
 * keeps going up, and stays visible, while the viewer reads another chat. A message with
 * files shows at once and posts once every file is ready, as on Telegram; until the server
 * acknowledges it, it can be withdrawn.
 */
export class ConversationOutbox {
  private entries: OutboxEntry[];
  private snapshot: OutboxSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly requests = new Map<string, AbortController>();
  private readonly landings = new Map<string, (message: Message) => void>();
  private readonly authors = new Map<string, MessageAuthor>();
  private readonly ports: ConversationOutboxPorts;
  private readonly stopFollowingUploads: () => void;

  constructor(ports: ConversationOutboxPorts) {
    this.ports = ports;
    this.entries = restore(ports.storage.read());
    this.snapshot = this.read();
    this.stopFollowingUploads = ports.uploads.subscribe(() => this.followUploads());
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Sends a message; with `withFiles` its files, committed under `nonce`, go up first.
   * Settles once the server has it, however many retries that takes. */
  send(
    message: ComposedMessage,
    author: MessageAuthor,
    nonce: string,
    withFiles: boolean,
  ): Promise<Message> {
    const landed = new Promise<Message>((resolve) => this.landings.set(nonce, resolve));
    this.authors.set(nonce, author);
    const input = { ...message, clientNonce: nonce };
    this.change(enqueue(this.entries, input, new Date().toISOString(), withFiles));

    if (withFiles) this.followUploads();
    else void this.deliver(nonce);
    return landed;
  }

  retry(nonce: string, author: MessageAuthor) {
    const entry = this.find(nonce);
    if (entry?.status !== 'failed') return;
    this.authors.set(nonce, author);

    if (entry.awaitsFiles) {
      this.change(update(this.entries, nonce, { status: 'uploading' }));
      const failed = this.ports.uploads.getCommitted(nonce).filter((d) => d.status === 'error');
      failed.forEach((draft) => this.ports.uploads.retry(draft.key));
      return;
    }
    this.change(update(this.entries, nonce, { status: 'sending' }));
    void this.deliver(nonce);
  }

  /** Withdraws an unsent message: its files stop going up, its request is aborted. */
  cancel(nonce: string) {
    this.drop(nonce);
    this.requests.get(nonce)?.abort();
    this.ports.uploads.getCommitted(nonce).forEach((draft) => this.ports.uploads.remove(draft.key));
  }

  /** Takes one file out of a message still waiting on its files; the rest carry on. */
  cancelFile(nonce: string, key: string) {
    if (this.ports.uploads.getCommitted(nonce).some((draft) => draft.key === key)) {
      this.ports.uploads.remove(key);
    }
  }

  /** Lets go of the entries history already holds. */
  forget(delivered: ReadonlySet<string>) {
    const remaining = unsent(this.entries, delivered);
    if (remaining.length !== this.entries.length) this.change(remaining);
  }

  dispose() {
    this.stopFollowingUploads();
    this.requests.forEach((request) => request.abort());
    this.listeners.clear();
  }

  private find(nonce: string) {
    return this.entries.find((entry) => entry.input.clientNonce === nonce);
  }

  // Releasing files notifies the queue's listeners, this one included, mid-loop: each entry
  // is looked up afresh so one that nested call already posted is not posted twice.
  private followUploads() {
    const waiting = this.entries.filter((entry) => entry.awaitsFiles);
    for (const { input } of waiting) {
      const nonce = input.clientNonce;
      const entry = this.find(nonce);
      if (!entry?.awaitsFiles) continue;
      const drafts = this.ports.uploads.getCommitted(nonce);

      if (drafts.length === 0) {
        if (speaksWithoutFiles(entry.input)) this.post(entry, []);
        else this.drop(nonce);
      } else if (drafts.some((draft) => draft.status === 'error')) {
        if (entry.status !== 'failed')
          this.change(update(this.entries, nonce, { status: 'failed' }));
      } else if (drafts.every((draft) => draft.status === 'ready')) {
        this.post(entry, drafts);
      }
    }
    // The composer's own files change the queue too; only a waiting message's files matter here.
    if (waiting.length) this.publish();
  }

  private post(entry: OutboxEntry, drafts: AttachmentDraft[]) {
    const nonce = entry.input.clientNonce;
    const input = drafts.length
      ? { ...entry.input, attachments: sentAttachments(drafts) }
      : entry.input;
    this.change(update(this.entries, nonce, { input, status: 'sending', awaitsFiles: false }));
    this.ports.uploads.releaseCommitted(nonce);
    void this.deliver(nonce);
  }

  private async deliver(nonce: string) {
    const entry = this.find(nonce);
    if (!entry) return;
    const request = new AbortController();
    this.requests.set(nonce, request);

    let message: Message;
    try {
      message = await this.ports.post(entry.input, request.signal);
    } catch {
      if (!request.signal.aborted) this.change(update(this.entries, nonce, { status: 'failed' }));
      return;
    } finally {
      this.requests.delete(nonce);
    }

    this.landings.get(nonce)?.(message);
    const author = this.authors.get(nonce);
    if (author) await this.ports.arrive(message, author);
    this.drop(nonce);
  }

  private drop(nonce: string) {
    this.landings.delete(nonce);
    this.authors.delete(nonce);
    if (this.find(nonce)) this.change(without(this.entries, nonce));
  }

  private change(entries: OutboxEntry[]) {
    this.entries = entries;
    this.ports.storage.write(persistable(entries));
    this.publish();
  }

  private publish() {
    this.snapshot = this.read();
    this.listeners.forEach((listener) => listener());
  }

  private read(): OutboxSnapshot {
    const files = new Map<string, AttachmentDraft[]>();
    for (const entry of this.entries) {
      if (entry.awaitsFiles) {
        const nonce = entry.input.clientNonce;
        files.set(nonce, this.ports.uploads.getCommitted(nonce));
      }
    }
    return { entries: this.entries, files };
  }
}
