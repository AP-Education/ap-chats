import type { CallRecord } from '@/components/calls/types';

import type { MessageModel } from '../../messages/types/message.types';
import type { MessageReaction } from '../../reactions/types/reaction.types';

type Profile = { displayName: string | null; avatarPath: string | null };

/** Just what a reply preview shows of the message it answers. */
export interface ReplyPreview {
  id: string;
  authorMemberId: string;
  contentMarkdown: string;
  deletedAt: Date | null;
}

export interface Mention extends Profile {
  memberId: string;
}

export interface MessageHistoryRow {
  type: 'MESSAGE';
  seq: bigint;
  createdAt: Date;
  message: MessageModel;
  authorProfile: Profile;
  reply: ReplyPreview | null;
  replyAuthorProfile: Profile | null;
  forwardAuthorProfile: Profile | null;
  pin: {
    messageId: string;
    pinnedAt: Date;
    pinnedByMemberId: string;
  } | null;
  mentions: Mention[];
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

/** One page of a channel's history as one member sees it. */
export interface HistoryPageQuery {
  channelId: string;
  viewerMemberId: string;
  direction: 'before' | 'after';
  /** Exclusive; without it the page starts at the oldest or the newest entry. */
  cursor?: bigint | undefined;
  /** The snapshot the reader is paging through; later entries stay out. */
  ceiling: bigint;
  limit: number;
}

export interface HistoryRowsPage {
  rows: HistoryRow[];
  hasMore: boolean;
}
