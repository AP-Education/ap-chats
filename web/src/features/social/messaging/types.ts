import type { Attachment } from './attachments/types';

export interface Message {
  id: string;
  seq: string;
  authorMemberId: string;
  clientNonce: string | null;
  markdown: string | null;
  attachments?: Attachment[];
  contentVersion: number;
  revision: number;
  replyToMessageId: string | null;
  quoteText: string | null;
  isForwarded: boolean;
  forwardedFromMemberId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface MessageHistoryItem {
  type: 'MESSAGE';
  id: string;
  seq: string;
  createdAt: string;
  message: Message;
  author: MessageAuthor;
  reply: {
    id: string;
    authorMemberId: string;
    author: MessageAuthor | null;
    markdown: string | null;
  } | null;
  forwardedFrom: MessageAuthor | null;
  pin: { pinnedAt: string; pinnedByMemberId: string } | null;
  mentions?: { memberId: string; displayName: string | null; avatarPath: string | null }[];
}

export type CallEntryStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed';

export interface CallHistoryItem {
  type: 'CALL';
  id: string;
  seq: string;
  createdAt: string;
  call: {
    id: string;
    status: CallEntryStatus;
    startedByMemberId: string;
    startedAt: string;
    endedAt: string | null;
  };
  startedBy: MessageAuthor;
}

// A row in the channel timeline: exactly one kind, never a grab-bag of
// optional message/call fields (mirrors the backend's HistoryRow union).
export type HistoryItem = MessageHistoryItem | CallHistoryItem;

// The one shared narrowing point: selection, editing, forwarding, pinning and
// read-receipts are message-only concepts, and all of them filter through this
// same predicate rather than re-deriving `item.type === 'MESSAGE'` locally.
export function isMessageItem(item: HistoryItem): item is MessageHistoryItem {
  return item.type === 'MESSAGE';
}

export interface MessageAuthor {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}

export interface ReadState {
  lastReadEntrySeq: string;
  unreadCount: number;
}

export interface HistoryPage {
  items: HistoryItem[];
  snapshotSeq: string;
  firstUnreadSeq: string | null;
  unreadCount: number;
  hasOlder: boolean;
  olderCursor: string | null;
  hasNewer: boolean;
  newerCursor: string | null;
  readState: ReadState | null;
}

export interface SendMessageInput {
  markdown: string;
  clientNonce: string;
  replyToMessageId?: string;
  quoteText?: string;
  attachmentIds?: string[];
  attachmentDescriptions?: Record<string, string>;
  attachments?: Attachment[];
}
