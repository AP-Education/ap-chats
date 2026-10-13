import { isMuted } from '@/components/notifications/preferences/notification-settings.rules';

import type { ConversationRow } from './types';

export type ConversationView = ReturnType<typeof conversationView>;

export function conversationView(row: ConversationRow) {
  const other = row.first.id === row.viewerId ? row.second : row.first;
  const { muted, mutedUntil, level } = row.notification;

  return {
    id: row.channel.id,
    workspaceId: row.channel.workspaceId,
    participant: {
      memberId: other.id,
      displayName: other.displayName,
      avatarPath: other.avatarPath,
      active: other.status === 'active',
    },
    notification: {
      isMuted: isMuted({ notificationsMuted: muted, mutedUntil, level }),
      mutedUntil,
    },
    lastMessage: row.lastMessage
      ? {
          id: row.lastMessage.id,
          markdown: row.lastMessage.deletedAt ? null : row.lastMessage.markdown,
          authorMemberId: row.lastMessage.authorMemberId,
          createdAt: row.lastMessage.createdAt,
        }
      : null,
    updatedAt: row.channel.updatedAt,
  };
}
