import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { Attachment } from '@/components/social/messages/attachments/types';

import { channels } from './channels';
import { workspaceMembers } from './workspace-members';

export const chatUploads = pgTable(
  'chat_uploads',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'set null' }),
    ownerMemberId: uuid('owner_member_id').references(() => workspaceMembers.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    size: integer('size').notNull(),
    objectKey: text('object_key').notNull().unique(),
    multipartId: text('multipart_id').notNull(),
    state: text('state', { enum: ['uploading', 'ready', 'attached', 'cancelled'] })
      .notNull()
      .default('uploading'),
    processingToken: uuid('processing_token'),
    processingUntil: timestamp('processing_until', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Attachment>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('chat_uploads_owner_state_idx').on(table.ownerMemberId, table.state),
    index('chat_uploads_cleanup_idx').on(table.expiresAt),
    check('chat_uploads_size_check', sql`${table.size} > 0 AND ${table.size} <= 1000000000`),
    check(
      'chat_uploads_state_check',
      sql`${table.state} IN ('uploading', 'ready', 'attached', 'cancelled')`,
    ),
  ],
);
