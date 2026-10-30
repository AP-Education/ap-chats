import { messageBlocks } from '@/components/social/messages/message-blocks';

import type { ConversationRow } from './types';

export type ConversationView = ReturnType<typeof conversationView>;

export function conversationView(row: ConversationRow, isMuted: boolean) {
  const other = row.first.id === row.viewerId ? row.second : row.first;

  return {
    id: row.channel.id,
    workspaceId: row.channel.workspaceId,
    participant: {
      memberId: other.id,
      displayName: other.displayName,
      avatarPath: other.avatarPath,
      active: other.status === 'active',
    },
    notification: { isMuted, mutedUntil: row.notification.mutedUntil },
    lastMessage: row.lastMessage
      ? {
          id: row.lastMessage.id,
          markdown: row.lastMessage.deletedAt ? null : row.lastMessage.markdown,
          blocks: row.lastMessage.deletedAt ? [] : messageBlocks(row.lastMessage),
          attachments: row.lastMessage.deletedAt ? [] : (row.lastMessage.attachments ?? []),
          authorMemberId: row.lastMessage.authorMemberId,
          createdAt: row.lastMessage.createdAt,
        }
      : null,
    updatedAt: row.channel.updatedAt,
  };
}
