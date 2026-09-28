import { bigint, foreignKey, index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { channels } from './channels';
import { chatMessages } from './chat-messages';

export const channelEntries = pgTable(
  'channel_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    seq: bigint('seq', { mode: 'bigint' }).notNull(),
    messageId: uuid('message_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('channel_entries_channel_seq_key').on(table.channelId, table.seq),
    unique('channel_entries_message_key').on(table.messageId),
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
  ],
);
