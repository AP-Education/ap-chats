import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import type { Attachment } from '@/components/social/messages/attachments/types';

import { channels } from './channels';
import { workspaceMembers } from './workspace-members';

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    authorMemberId: uuid('author_member_id').notNull(),
    contentMarkdown: text('content_markdown').notNull(),
    attachments: jsonb('attachments').$type<Attachment[]>().notNull().default([]),
    contentVersion: integer('content_version').notNull().default(1),
    revision: integer('revision').notNull().default(1),
    replyToMessageId: uuid('reply_to_message_id'),
    quoteText: text('quote_text'),
    forwardedFromMessageId: uuid('forwarded_from_message_id'),
    forwardedFromMemberId: uuid('forwarded_from_member_id'),
    requestDigest: text('request_digest').notNull(),
    clientNonce: uuid('client_nonce').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('chat_messages_workspace_channel_id_key').on(
      table.workspaceId,
      table.channelId,
      table.id,
    ),
    unique('chat_messages_channel_author_nonce_key').on(
      table.channelId,
      table.authorMemberId,
      table.clientNonce,
    ),
    index('chat_messages_reply_idx').on(table.replyToMessageId),
    index('chat_messages_attachments_idx').using('gin', table.attachments),
    check('chat_messages_content_version_check', sql`${table.contentVersion} = 1`),
    check('chat_messages_revision_check', sql`${table.revision} >= 1`),
    check(
      'chat_messages_attachments_check',
      sql`jsonb_typeof(${table.attachments}) = 'array' AND jsonb_array_length(${table.attachments}) <= 10`,
    ),
    foreignKey({
      columns: [table.workspaceId, table.channelId],
      foreignColumns: [channels.workspaceId, channels.id],
      name: 'chat_messages_channel_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.authorMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'chat_messages_author_workspace_fk',
    }),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.replyToMessageId],
      foreignColumns: [table.workspaceId, table.channelId, table.id],
      name: 'chat_messages_reply_channel_fk',
    }),
    foreignKey({
      columns: [table.forwardedFromMessageId],
      foreignColumns: [table.id],
      name: 'chat_messages_forward_source_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.workspaceId, table.forwardedFromMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'chat_messages_forward_author_workspace_fk',
    }),
  ],
);
