import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { calls } from './calls';
import { channels } from './channels';
import { chatMessages } from './chat-messages';

// Per docs/channel-history-model.md: a narrow position index. Each row has
// exactly one subject reference — messageId today, callId as of this
// increment, system_event_id when that domain table exists.
export const channelEntries = pgTable(
  'channel_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    seq: bigint('seq', { mode: 'bigint' }).notNull(),
    messageId: uuid('message_id'),
    callId: uuid('call_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('channel_entries_channel_seq_key').on(table.channelId, table.seq),
    unique('channel_entries_message_key').on(table.messageId),
    unique('channel_entries_call_key').on(table.callId),
    index('channel_entries_channel_seq_desc_idx').on(table.channelId, table.seq.desc()),
    foreignKey({
      columns: [table.workspaceId, table.channelId],
      foreignColumns: [channels.workspaceId, channels.id],
      name: 'channel_entries_channel_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.messageId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'channel_entries_message_channel_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.callId],
      foreignColumns: [calls.workspaceId, calls.channelId, calls.id],
      name: 'channel_entries_call_channel_fk',
    }).onDelete('cascade'),
    check(
      'channel_entries_exactly_one_subject',
      sql`num_nonnulls(${table.messageId}, ${table.callId}) = 1`,
    ),
  ],
);
