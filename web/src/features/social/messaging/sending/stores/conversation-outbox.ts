import type { AttachmentDraft } from '../../attachments/types';
import type { ComposedMessage, Message, SendMessageCommand } from '../../types';
import type { OutboxEntry, OutboxPorts, OutboxSnapshot } from '../types';
import { enqueue, persistable, restore, unsent, update, without } from '../utils/outbox-entries';

function speaksWithoutFiles(input: SendMessageCommand): boolean {
  return Boolean(input.markdown.trim()) || Boolean(input.blocks?.length);
}

function sentAttachments(drafts: AttachmentDraft[]) {
  return drafts.map((draft) => ({ ...draft.attachment!, description: draft.description || null }));
}

/** One conversation's unsent messages, kept beyond its screen so they finish in another chat. */
export class ConversationOutbox {
  private entries: OutboxEntry[];
  private snapshot: OutboxSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly requests = new Map<string, AbortController>();
  private readonly landings = new Map<string, (message: Message) => void>();
  private readonly ports: OutboxPorts;
  private readonly stopFollowingUploads: () => void;

  constructor(ports: OutboxPorts) {
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

  /** Posts once the files committed under `nonce` are up; settles once the server has it. */
  send(message: ComposedMessage, nonce: string): Promise<Message> {
    const landed = this.expectLanding(nonce);
    const awaitsFiles = this.ports.uploads.getCommitted(nonce).length > 0;

    this.change(enqueue(this.entries, { ...message, clientNonce: nonce }, now(), awaitsFiles));

    if (awaitsFiles) this.followUploads();
    else void this.deliver(nonce);
    return landed;
  }

  retry(nonce: string) {
    const entry = this.find(nonce);
    if (entry?.status !== 'failed') return;

    if (entry.awaitsFiles) {
      this.change(update(this.entries, nonce, { status: 'uploading' }));
      this.failedFiles(nonce).forEach((draft) => this.ports.uploads.retry(draft.key));
      return;
    }

    this.change(update(this.entries, nonce, { status: 'sending' }));
    void this.deliver(nonce);
  }

  cancel(nonce: string) {
    this.drop(nonce);
    this.requests.get(nonce)?.abort();
    this.ports.uploads.getCommitted(nonce).forEach((draft) => this.ports.uploads.remove(draft.key));
  }

  cancelFile(nonce: string, key: string) {
    const isCommitted = this.ports.uploads.getCommitted(nonce).some((draft) => draft.key === key);
    if (isCommitted) this.ports.uploads.remove(key);
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

  private expectLanding(nonce: string) {
    return new Promise<Message>((resolve) => this.landings.set(nonce, resolve));
  }

  private find(nonce: string) {
    return this.entries.find((entry) => entry.input.clientNonce === nonce);
  }

  private failedFiles(nonce: string) {
    return this.ports.uploads.getCommitted(nonce).filter((draft) => draft.status === 'error');
  }

  // Releasing files notifies this listener again mid-loop, so each entry is looked up afresh.
  private followUploads() {
    const waiting = this.entries.filter((entry) => entry.awaitsFiles);

    for (const { input } of waiting) {
      const entry = this.find(input.clientNonce);
      if (entry?.awaitsFiles) this.advance(entry);
    }

    // The composer's own files move the queue too; only a waiting message's files matter here.
    if (waiting.length) this.publish();
  }

  private advance(entry: OutboxEntry) {
    const nonce = entry.input.clientNonce;
    const drafts = this.ports.uploads.getCommitted(nonce);
    const allTakenOut = drafts.length === 0;
    const anyFailed = drafts.some((draft) => draft.status === 'error');
    const allReady = drafts.every((draft) => draft.status === 'ready');

    if (allTakenOut && !speaksWithoutFiles(entry.input)) this.drop(nonce);
    else if (anyFailed && entry.status !== 'failed') {
      this.change(update(this.entries, nonce, { status: 'failed' }));
    } else if (!anyFailed && allReady) this.post(entry, drafts);
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
    await this.ports.recordSent(message);
    this.drop(nonce);
  }

  private drop(nonce: string) {
    this.landings.delete(nonce);
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
    const waiting = this.entries.filter((entry) => entry.awaitsFiles);
    const files = new Map(
      waiting.map(({ input }) => [
        input.clientNonce,
        this.ports.uploads.getCommitted(input.clientNonce),
      ]),
    );
    return { entries: this.entries, files };
  }
}

function now() {
  return new Date().toISOString();
}
