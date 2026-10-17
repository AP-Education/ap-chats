import type { UnreadMutation } from '@/features/realtime/types';

import type { ChannelUnread } from './hooks/useWorkspaceUnread';

const UNREAD_CAP = 100;

export function applyUnreadMutation(
  current: ChannelUnread[],
  mutation: UnreadMutation,
  memberId: string,
): ChannelUnread[] {
  return current.map((channel) => {
    if (channel.channelId !== mutation.channelId) return channel;
    const affected = unreadEntries(channel, mutation, memberId);
    if (!affected) return channel;
    if (mutation.operation === 'append') {
      return {
        ...channel,
        unreadCount: Math.min(UNREAD_CAP, channel.unreadCount + affected),
        mentionCount: mutation.mentionsMe
          ? Math.min(UNREAD_CAP, channel.mentionCount + affected)
          : channel.mentionCount,
      };
    }
    if (channel.unreadCount === UNREAD_CAP) return channel;
    return { ...channel, unreadCount: Math.max(0, channel.unreadCount - affected) };
  });
}

/** A removal can take an unread mention with it, which only the server can still tell. */
export function mayRemoveUnreadMention(
  current: ChannelUnread[],
  mutation: UnreadMutation,
  memberId: string,
): boolean {
  if (mutation.operation !== 'remove') return false;
  const channel = current.find((each) => each.channelId === mutation.channelId);
  return Boolean(channel?.mentionCount && unreadEntries(channel, mutation, memberId));
}

function unreadEntries(channel: ChannelUnread, mutation: UnreadMutation, memberId: string) {
  const cursor = BigInt(channel.lastReadEntrySeq);
  return mutation.entries.filter(
    (entry) => entry.authorMemberId !== memberId && BigInt(entry.seq) > cursor,
  ).length;
}
