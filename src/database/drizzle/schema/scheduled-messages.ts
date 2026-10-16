import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { channels } from './channels';
import { chatMessages } from './chat-messages';
import { workspaceMembers } from './workspace-members';

/** A send request its author holds until `send_at`; it takes no place in the history before then. */
export const scheduledMessages = pgTable(
  'scheduled_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    authorMemberId: uuid('author_member_id').notNull(),
    contentMarkdown: text('content_markdown').notNull(),
    replyToMessageId: uuid('reply_to_message_id'),
    quoteText: text('quote_text'),
    sendAt: timestamp('send_at', { withTimezone: true }).notNull(),
    revision: integer('revision').notNull().default(1),
    requestDigest: text('request_digest').notNull(),
    clientNonce: uuid('client_nonce').notNull(),
    failure: text('failure'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('scheduled_messages_channel_author_nonce_key').on(
      table.channelId,
      table.authorMemberId,
      table.clientNonce,
    ),
    index('scheduled_messages_author_idx').on(table.channelId, table.authorMemberId, table.sendAt),
    index('scheduled_messages_due_idx')
      .on(table.sendAt)
      .where(sql`${table.failure} IS NULL`),
    check('scheduled_messages_revision_check', sql`${table.revision} >= 1`),
    foreignKey({
      columns: [table.workspaceId, table.channelId],
      foreignColumns: [channels.workspaceId, channels.id],
      name: 'scheduled_messages_channel_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.authorMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'scheduled_messages_author_workspace_fk',
    }),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.replyToMessageId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'scheduled_messages_reply_channel_fk',
    }),
  ],
);
