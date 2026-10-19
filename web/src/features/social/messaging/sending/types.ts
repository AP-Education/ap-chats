import type { AttachmentDraft } from '../attachments/types';
import type { DeliveryStatus, Message, SendMessageCommand } from '../types';

export interface ConversationKey {
  identity: string | undefined;
  workspaceId: string;
  channelId: string;
}

/** A message this client wrote that history doesn't hold yet. */
export interface OutboxEntry {
  input: SendMessageCommand;
  createdAt: string;
  status: DeliveryStatus;
  /** Its files are still in the upload queue under its nonce, so `input` carries none yet. */
  awaitsFiles?: boolean;
}

export interface OutboxSnapshot {
  entries: readonly OutboxEntry[];
  /** Live files of the entries still waiting on them, by nonce. */
  files: ReadonlyMap<string, AttachmentDraft[]>;
}

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

export interface OutboxPorts {
  uploads: OutboxUploads;
  storage: OutboxStorage;
  post: (input: SendMessageCommand, signal: AbortSignal) => Promise<Message>;
  /** Shows an acknowledged message where the app lists messages, before the outbox lets it go. */
  recordSent: (message: Message) => Promise<void>;
}

export interface UnsentMessages {
  retry: (rowId: string) => void;
  discard: (rowId: string) => void;
  discardFile: (rowId: string, fileKey: string) => void;
}
