export interface Message {
  id: string;
  seq: string;
  authorMemberId: string;
  clientNonce: string | null;
  markdown: string | null;
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

export interface HistoryItem {
  type: 'MESSAGE';
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
}
