import { messageBlocks } from '../messages/message-blocks';
import { messageView } from '../messages/message-view';
import type { ReadPosition } from '../read-state/types';
import type { CallHistoryRow, HistoryRow, MessageHistoryRow } from './types/history.types';

type Profile = {
  displayName: string | null;
  avatarPath: string | null;
  isBot: boolean;
  roleColor: string | null;
};

interface HistoryPageInput {
  rows: HistoryRow[];
  viewerMemberId: string;
  snapshotSeq: bigint;
  position: ReadPosition;
  hasOlder: boolean;
  hasNewer: boolean;
}

export function historyPageView({
  rows,
  viewerMemberId,
  snapshotSeq,
  position,
  hasOlder,
  hasNewer,
}: HistoryPageInput) {
  const items = rows.map((row) => historyItemView(row, viewerMemberId));
  const { state: readState, firstUnreadSeq, peerReadSeq } = position;

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
    peerReadSeq: peerReadSeq?.toString() ?? null,
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
      answeredAt: call.answeredAt,
      endedAt: call.endedAt,
    },
    startedBy: personView(call.startedByMemberId, startedByProfile),
  };
}

function messageItemView(row: MessageHistoryRow, viewerMemberId: string) {
  const { seq, createdAt, message, reply, context, pin } = row;
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
      blocks: reply.deletedAt ? [] : messageBlocks(reply),
      attachments: reply.deletedAt ? [] : (reply.attachments ?? []),
    },
    context: context && {
      count: context.count,
      first: {
        id: context.first.id,
        authorMemberId: context.first.authorMemberId,
        author: personView(context.first.authorMemberId, context.first.author),
        markdown: context.first.contentMarkdown,
        blocks: messageBlocks(context.first),
        attachments: context.first.attachments ?? [],
      },
    },
    forwardedFrom:
      forwardedFromMemberId && row.forwardAuthorProfile
        ? personView(forwardedFromMemberId, row.forwardAuthorProfile)
        : null,
    pin: pin && { pinnedAt: pin.pinnedAt, pinnedByMemberId: pin.pinnedByMemberId },
    mentions: row.mentions,
    mentionsMe: row.mentionsViewer,
    rolesMentioningMe: row.rolesMentioningViewer,
    reactions: row.reactions,
  };
}

function personView(memberId: string, { displayName, avatarPath, isBot, roleColor }: Profile) {
  return { memberId, displayName, avatarPath, isBot, roleColor };
}
