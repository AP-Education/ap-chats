import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

import { chatMessages } from './chat-messages';
import { roles } from './roles';
import { workspaceMembers } from './workspace-members';

export const messageMentions = pgTable(
  'message_mentions',
  {
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    messageId: uuid('message_id').notNull(),
    memberId: uuid('member_id').notNull(),
    via: text('via', { enum: ['direct', 'role', 'everyone'] })
      .notNull()
      .default('direct'),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.memberId] }),
    check('message_mentions_via_check', sql`${table.via} in ('direct', 'role', 'everyone')`),
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

// The roles that carried a message to each person it reached through one, so their tags can say so.
export const messageRoleMentions = pgTable(
  'message_role_mentions',
  {
    messageId: uuid('message_id').notNull(),
    memberId: uuid('member_id').notNull(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.memberId, table.roleId] }),
    index('message_role_mentions_role_idx').on(table.roleId),
    foreignKey({
      columns: [table.messageId, table.memberId],
      foreignColumns: [messageMentions.messageId, messageMentions.memberId],
      name: 'message_role_mentions_mention_fk',
    }).onDelete('cascade'),
  ],
);
