import type { MessageModel } from '../../messages/types/message.types';

export interface HistoryRow {
  seq: bigint;
  createdAt: Date;
  message: MessageModel;
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
