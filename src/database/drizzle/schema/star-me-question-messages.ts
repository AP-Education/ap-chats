import { foreignKey, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { chatMessages } from './chat-messages';

/** The messages a person picked for StarMe to read when they asked it a question. */
export const starMeQuestionMessages = pgTable(
  'star_me_question_messages',
  {
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    questionId: uuid('question_id').notNull(),
    messageId: uuid('message_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.questionId, table.messageId] }),
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.questionId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'star_me_question_messages_question_fk',
    }).onDelete('cascade'),
    // Same channel as the question: a picked message never comes from elsewhere.
    foreignKey({
      columns: [table.workspaceId, table.channelId, table.messageId],
      foreignColumns: [chatMessages.workspaceId, chatMessages.channelId, chatMessages.id],
      name: 'star_me_question_messages_message_fk',
    }).onDelete('cascade'),
  ],
);
