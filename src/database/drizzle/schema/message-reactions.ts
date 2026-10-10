import { sql } from 'drizzle-orm';
import { check, foreignKey, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { chatMessages } from './chat-messages';
import { workspaceMembers } from './workspace-members';

export const messageReactions = pgTable(
  'message_reactions',
  {
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    messageId: uuid('message_id').notNull(),
    emoji: text('emoji').notNull(),
    memberId: uuid('member_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Emoji before member: a page's counts and one chip's reactors are both prefix scans.
    primaryKey({ columns: [table.messageId, table.emoji, table.memberId] }),
    check('message_reactions_emoji_check', sql`char_length(${table.emoji}) BETWEEN 1 AND 32`),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.messageId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'message_reactions_message_channel_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.memberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'message_reactions_member_workspace_fk',
    }),
  ],
);
