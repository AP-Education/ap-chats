import { messageView } from '../messages/message-view';
import type { ChannelReadState } from '../read-state/types';
import type { CallHistoryRow, HistoryRow, MessageHistoryRow } from './types/history.types';

type Profile = { displayName: string | null; avatarPath: string | null };

interface HistoryPageInput {
  rows: HistoryRow[];
  viewerMemberId: string;
  snapshotSeq: bigint;
  readState: ChannelReadState | null;
  firstUnreadSeq: bigint | null;
  hasOlder: boolean;
  hasNewer: boolean;
}

export function historyPageView({
  rows,
  viewerMemberId,
  snapshotSeq,
  readState,
  firstUnreadSeq,
  hasOlder,
  hasNewer,
}: HistoryPageInput) {
  const items = rows.map((row) => historyItemView(row, viewerMemberId));

  return {
    items,
    snapshotSeq: snapshotSeq.toString(),
    firstUnreadSeq: firstUnreadSeq?.toString() ?? null,
    unreadCount: readState?.unreadCount ?? 0,
    hasOlder,
    olderCursor: hasOlder ? (items[0]?.seq ?? null) : null,
    hasNewer,
    newerCursor: hasNewer ? (items.at(-1)?.seq ?? null) : null,
    readState,
  };
}

export function historyItemView(row: HistoryRow, viewerMemberId: string) {
  return row.type === 'CALL' ? callItemView(row) : messageItemView(row, viewerMemberId);
}

function callItemView({ seq, createdAt, call, startedByProfile }: CallHistoryRow) {
  return {
    type: 'CALL' as const,
    id: call.id,
    seq: seq.toString(),
    createdAt,
    call: {
      id: call.id,
      status: call.status,
      startedByMemberId: call.startedByMemberId,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
    },
    startedBy: personView(call.startedByMemberId, startedByProfile),
  };
}

function messageItemView(row: MessageHistoryRow, viewerMemberId: string) {
  const { seq, createdAt, message, reply, pin } = row;
  const forwardedFromMemberId = message.forwardedFromMemberId;

  return {
    type: 'MESSAGE' as const,
    id: message.id,
    seq: seq.toString(),
    createdAt,
    message: messageView(message, seq, viewerMemberId),
    author: personView(message.authorMemberId, row.authorProfile),
    reply: reply && {
      id: reply.id,
      authorMemberId: reply.authorMemberId,
      author: row.replyAuthorProfile && personView(reply.authorMemberId, row.replyAuthorProfile),
      markdown: reply.deletedAt ? null : reply.contentMarkdown,
    },
    forwardedFrom:
      forwardedFromMemberId && row.forwardAuthorProfile
        ? personView(forwardedFromMemberId, row.forwardAuthorProfile)
        : null,
    pin: pin && { pinnedAt: pin.pinnedAt, pinnedByMemberId: pin.pinnedByMemberId },
    mentions: row.mentions,
    reactions: row.reactions,
  };
}

function personView(memberId: string, { displayName, avatarPath }: Profile) {
  return { memberId, displayName, avatarPath };
}
