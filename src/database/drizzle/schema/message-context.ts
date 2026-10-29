import { foreignKey, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { chatMessages } from './chat-messages';

/** The earlier messages of its channel a message is about, quoted with it and read by who answers. */
export const messageContext = pgTable(
  'message_context',
  {
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    messageId: uuid('message_id').notNull(),
    contextMessageId: uuid('context_message_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.contextMessageId] }),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.messageId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'message_context_message_fk',
    }).onDelete('cascade'),
    // Same channel as the message: its context never comes from elsewhere.
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.contextMessageId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'message_context_context_fk',
    }).onDelete('cascade'),
  ],
);
