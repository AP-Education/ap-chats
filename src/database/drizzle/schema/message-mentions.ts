import { sql } from 'drizzle-orm';
import { check, foreignKey, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

import { chatMessages } from './chat-messages';
import { workspaceMembers } from './workspace-members';

export const messageMentions = pgTable(
  'message_mentions',
  {
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    messageId: uuid('message_id').notNull(),
    memberId: uuid('member_id').notNull(),
    via: text('via', { enum: ['direct', 'everyone'] })
      .notNull()
      .default('direct'),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.memberId] }),
    check('message_mentions_via_check', sql`${table.via} in ('direct', 'everyone')`),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.messageId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'message_mentions_message_channel_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.memberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'message_mentions_member_workspace_fk',
    }),
  ],
);
