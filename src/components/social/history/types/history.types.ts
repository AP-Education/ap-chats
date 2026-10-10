import type { CallRecord } from '@/components/calls/types';

import type { MessageModel } from '../../messages/types/message.types';
import type { MessageReaction } from '../../reactions/types/reaction.types';

type Profile = { displayName: string | null; avatarPath: string | null };

export interface MessageHistoryRow {
  type: 'MESSAGE';
  seq: bigint;
  createdAt: Date;
  message: MessageModel;
  authorProfile: Profile;
  reply: MessageModel | null;
  replyAuthorProfile: Profile | null;
  forwardAuthorProfile: Profile | null;
  pin: {
    messageId: string;
    pinnedAt: Date;
    pinnedByMemberId: string;
  } | null;
  mentions: { memberId: string; displayName: string | null; avatarPath: string | null }[];
  reactions: MessageReaction[];
}

export interface CallHistoryRow {
  type: 'CALL';
  seq: bigint;
  createdAt: Date;
  call: CallRecord;
  startedByProfile: Profile;
}

// One row per channel_entries position; the query joins both subject kinds,
// but a row is exactly one of them, never a grab-bag of optional fields.
export type HistoryRow = MessageHistoryRow | CallHistoryRow;

export interface HistoryRowsPage {
  rows: HistoryRow[];
  hasMore: boolean;
}
