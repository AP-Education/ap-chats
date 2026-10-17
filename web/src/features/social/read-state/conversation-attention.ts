import type { ConversationNotify } from '@/features/communities/notifications/types';

import type { ChannelUnread } from './hooks/useWorkspaceUnread';

/** What a conversation, or a group of them, asks of the person. */
export interface Attention {
  /** Something new to read: the marker beside a conversation, its workspace or its tab. */
  unread: boolean;
  /** What is meant for them: every message of a direct conversation, mentions anywhere else. */
  badge: number;
  /** Muted, and so drawn dimmed; a group is muted once all of it is. */
  muted: boolean;
}

export const QUIET: Attention = { unread: false, badge: 0, muted: false };
const MUTED: Attention = { ...QUIET, muted: true };

/** A conversation asks for nothing once muted; how loud its pushes are never changes its badge. */
export function conversationAttention(
  conversation: ChannelUnread,
  notify: ConversationNotify,
): Attention {
  if (notify === 'none') return MUTED;

  const badge = conversation.kind === 'dm' ? conversation.unreadCount : conversation.mentionCount;
  return { unread: conversation.unreadCount > 0, badge, muted: false };
}

export function combinedAttention(attentions: Iterable<Attention>): Attention {
  let unread = false;
  let badge = 0;
  let muted: boolean | undefined;
  for (const attention of attentions) {
    unread ||= attention.unread;
    badge += attention.badge;
    muted = (muted ?? true) && attention.muted;
  }
  return { unread, badge, muted: muted ?? false };
}

/** Until its workspace says otherwise, a channel speaks up for mentions and a direct one for all. */
export function notifyOf(
  conversation: Pick<ChannelUnread, 'channelId' | 'kind'>,
  notifyByChannel: ReadonlyMap<string, ConversationNotify> | undefined,
): ConversationNotify {
  return (
    notifyByChannel?.get(conversation.channelId) ??
    (conversation.kind === 'dm' ? 'all' : 'mentions')
  );
}

/** A workspace's channels together, as its tile on the rail shows them. */
export function channelsAttention(
  conversations: ChannelUnread[] | undefined,
  notifyByChannel: ReadonlyMap<string, ConversationNotify> | undefined,
): Attention {
  const channels = (conversations ?? []).filter((conversation) => conversation.kind === 'channel');
  return combinedAttention(workspaceAttention(channels, notifyByChannel).values());
}

/** Every conversation of a workspace, as it reads to the person. */
export function workspaceAttention(
  conversations: ChannelUnread[] | undefined,
  notifyByChannel: ReadonlyMap<string, ConversationNotify> | undefined,
): Map<string, Attention> {
  return new Map(
    (conversations ?? []).map((conversation) => [
      conversation.channelId,
      conversationAttention(conversation, notifyOf(conversation, notifyByChannel)),
    ]),
  );
}
