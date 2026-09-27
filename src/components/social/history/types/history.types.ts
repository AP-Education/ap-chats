import type { MessageModel } from '../../messages/types/message.types';

export interface HistoryRow {
  seq: bigint;
  createdAt: Date;
  message: MessageModel;
  authorProfile: { displayName: string | null; avatarPath: string | null };
  reply: MessageModel | null;
  replyAuthorProfile: { displayName: string | null; avatarPath: string | null } | null;
  forwardAuthorProfile: { displayName: string | null; avatarPath: string | null } | null;
  pin: {
    messageId: string;
    pinnedAt: Date;
    pinnedByMemberId: string;
  } | null;
}

export interface HistoryRowsPage {
  rows: HistoryRow[];
  hasMore: boolean;
}
