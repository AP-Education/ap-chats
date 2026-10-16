import { NotificationIcon } from '@phosphor-icons/react';

import type { ConversationAction } from '../messaging/types';

export const readStateActions: ConversationAction[] = [
  {
    id: 'mark-unread',
    icon: <NotificationIcon size={18} />,
    label: () => 'Позначити непрочитаним',
    // The person's own messages never count as unread for them.
    available: (target, context) =>
      target.kind === 'message' && target.items[0].message.authorMemberId !== context.memberId,
    execute: (target, commands) => commands.markUnread(target.items[0]!),
  },
];
