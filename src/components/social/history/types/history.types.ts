import type { CallRecord } from '@/components/calls/types';
import type { MemberAppearance, MemberSummary } from '@/components/workspaces/members/types';

import type { MessageModel } from '../../messages/types/message.types';

export interface MessageHistoryRow {
  type: 'MESSAGE';
  seq: bigint;
  createdAt: Date;
  message: MessageModel;
  authorProfile: MemberAppearance;
  reply: MessageModel | null;
  replyAuthorProfile: MemberAppearance | null;
  forwardAuthorProfile: MemberAppearance | null;
  pin: {
    messageId: string;
    pinnedAt: Date;
    pinnedByMemberId: string;
  } | null;
  mentions: MemberSummary[];
}

export interface CallHistoryRow {
  type: 'CALL';
  seq: bigint;
  createdAt: Date;
  call: CallRecord;
  startedByProfile: MemberAppearance;
}

// One row per channel_entries position; the query joins both subject kinds,
// but a row is exactly one of them, never a grab-bag of optional fields.
export type HistoryRow = MessageHistoryRow | CallHistoryRow;

export interface HistoryRowsPage {
  rows: HistoryRow[];
  hasMore: boolean;
}
