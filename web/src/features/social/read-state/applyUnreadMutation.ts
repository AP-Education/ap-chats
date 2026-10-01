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
    const cursor = BigInt(channel.lastReadEntrySeq);
    const affected = mutation.entries.filter(
      (entry) => entry.authorMemberId !== memberId && BigInt(entry.seq) > cursor,
    ).length;
    if (!affected) return channel;
    if (mutation.operation === 'append') {
      return { ...channel, unreadCount: Math.min(UNREAD_CAP, channel.unreadCount + affected) };
    }
    if (channel.unreadCount === UNREAD_CAP) return channel;
    return { ...channel, unreadCount: Math.max(0, channel.unreadCount - affected) };
  });
}
