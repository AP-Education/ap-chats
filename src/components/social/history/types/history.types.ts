import type { CallRecord } from '@/components/calls/types';

import type { MessageModel } from '../../messages/types/message.types';

type Profile = { displayName: string | null; avatarPath: string | null };
type MentionedMember = Profile & { memberId: string };

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
  /** Members named in the text, for rendering their tags. */
  mentions: MentionedMember[];
  /** Whether the message reached the viewer, by name or through @everyone. */
  mentionsViewer: boolean;
}

/** A channel as one member sees it; the viewer decides which mentions are worth returning. */
export interface HistoryView {
  channelId: string;
  viewerMemberId: string;
}

export interface MessageMentions {
  named: MentionedMember[];
  viewer: boolean;
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
