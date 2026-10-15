import { sql } from 'drizzle-orm';
import {
  foreignKey,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

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
    // Emoji before member: a page's summaries and one chip's people are both prefix scans.
    primaryKey({ columns: [table.messageId, table.emoji, table.memberId] }),
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

export const messageReactionSummaries = pgView('message_reaction_summaries').as((qb) =>
  qb
    .select({
      messageId: messageReactions.messageId,
      emoji: messageReactions.emoji,
      count: sql<number>`count(*)::int`.as('count'),
      recentMemberIds: sql<
        string[]
      >`(array_agg(${messageReactions.memberId} order by ${messageReactions.createdAt} desc))[1:3]`.as(
        'recent_member_ids',
      ),
      firstReactedAt: sql<Date>`min(${messageReactions.createdAt})`.as('first_reacted_at'),
    })
    .from(messageReactions)
    .groupBy(messageReactions.messageId, messageReactions.emoji),
);
