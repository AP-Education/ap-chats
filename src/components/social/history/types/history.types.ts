import type { MessageModel } from '../../messages/types/message.types';
import type { MessageReaction } from '../../reactions/types/reaction.types';

type Person = { displayName: string | null; avatarPath: string | null };
/** A person as the workspace shows them: name, picture, and the colour of their top coloured role. */
type Profile = Person & { roleColor: string | null };

/** Just what a reply preview shows of the message it answers. */
export interface ReplyPreview {
  id: string;
  authorMemberId: string;
  contentMarkdown: string;
  deletedAt: Date | null;
}

export interface Mention extends Person {
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
  /** Members named in the text, for rendering their tags. */
  mentions: Mention[];
  /** Whether the message reached the viewer, by name, through a role or through @everyone. */
  mentionsViewer: boolean;
  /** The roles through which it reached the viewer, so those tags read as theirs. */
  rolesMentioningViewer: string[];
  reactions: MessageReaction[];
}

/** What the timeline shows of a call; the calls component owns the rest of it. */
export interface TimelineCall {
  id: string;
  status: string;
  startedByMemberId: string;
  startedAt: Date;
  answeredAt: Date | null;
  endedAt: Date | null;
}

export interface CallHistoryRow {
  type: 'CALL';
  seq: bigint;
  createdAt: Date;
  call: TimelineCall;
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
