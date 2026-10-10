import { foreignKey, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

import { chatMessages } from './chat-messages';
import { workspaceMembers } from './workspace-members';

export const messagePins = pgTable(
  'message_pins',
  {
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    messageId: uuid('message_id').notNull(),
    pinnedByMemberId: uuid('pinned_by_member_id').notNull(),
    pinnedAt: timestamp('pinned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.messageId] }),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.messageId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'message_pins_message_channel_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.pinnedByMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'message_pins_actor_workspace_fk',
    }).onDelete('cascade'),
  ],
);
