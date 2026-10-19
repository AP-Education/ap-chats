import type { ChannelUnread } from './hooks/useWorkspaceUnread';

/** What a conversation, or a group of them, asks of the person. */
export interface Attention {
  /** Something new to read: the marker beside a conversation, its workspace or its tab. */
  unread: boolean;
  /** What is meant for them: every message of a direct conversation, mentions anywhere else. */
  badge: number;
}

export interface ConversationAttention extends Attention {
  /** Muted, and so drawn dimmed. */
  muted: boolean;
}

export const QUIET: ConversationAttention = { unread: false, badge: 0, muted: false };
const MUTED: ConversationAttention = { ...QUIET, muted: true };

/** A conversation asks for nothing once muted; how loud its pushes are never changes its badge. */
export function conversationAttention(
  conversation: ChannelUnread,
  muted: boolean,
): ConversationAttention {
  if (muted) return MUTED;

  const badge = conversation.kind === 'dm' ? conversation.unreadCount : conversation.mentionCount;
  return { unread: conversation.unreadCount > 0, badge, muted: false };
}

export function combinedAttention(attentions: Iterable<Attention>): Attention {
  let unread = false;
  let badge = 0;
  for (const attention of attentions) {
    unread ||= attention.unread;
    badge += attention.badge;
  }
  return { unread, badge };
}
