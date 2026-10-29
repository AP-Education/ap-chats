import type { TimelineData, TimelineEntry } from '@ap-education/timeline';

import type { AttachmentDraft } from '../attachments/types';
import type {
  CallHistoryItem,
  HistoryItem,
  HistoryPage,
  MessageHistoryItem,
  ReadState,
} from '../types';
import { isMessageItem } from '../types';

export interface MessagePayload {
  item: MessageHistoryItem;
  /** The files of a message still on its way, with their live progress. */
  pendingAttachments?: AttachmentDraft[];
}

export interface CallPayload {
  item: CallHistoryItem;
}

/** A conversation's history entry as the timeline package carries it. */
export type ChatEntry =
  TimelineEntry<'MESSAGE', MessagePayload> | TimelineEntry<'CALL', CallPayload>;

export type MessageEntry = Extract<ChatEntry, { kind: 'MESSAGE' }>;
export type CallEntry = Extract<ChatEntry, { kind: 'CALL' }>;

/** What a history window says besides its entries. */
export interface ChatMeta {
  readState: ReadState | null;
  /** How far the others have read; null where the conversation shares no read receipts. */
  peerReadSeq: string | null;
  unreadCount: number;
}

export type ChatTimelineData = TimelineData<ChatEntry, ChatMeta>;

export function toEntry(item: HistoryItem): ChatEntry {
  if (isMessageItem(item)) {
    return {
      key: item.id,
      position: item.seq,
      kind: 'MESSAGE',
      at: item.createdAt,
      author: item.author.memberId,
      nonce: item.message.clientNonce ?? undefined,
      payload: { item },
    };
  }

  // A call belongs to whoever placed it, the same way a message belongs to its writer.
  return {
    key: item.id,
    position: item.seq,
    kind: 'CALL',
    at: item.createdAt,
    author: item.startedBy.memberId,
    payload: { item },
  };
}

export function metaOf(page: HistoryPage): ChatMeta {
  return {
    readState: page.readState,
    peerReadSeq: page.peerReadSeq,
    unreadCount: page.unreadCount,
  };
}

export function itemsOf(entries: readonly ChatEntry[]): HistoryItem[] {
  return entries.map((entry) => entry.payload.item);
}
