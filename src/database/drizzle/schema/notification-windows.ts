import { bigint, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const notificationWindows = pgTable(
  'push_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    firstSeq: bigint('first_seq', { mode: 'bigint' }).notNull(),
    lastSeq: bigint('last_seq', { mode: 'bigint' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('push_batches_conversation_idx').on(t.userId, t.channelId, t.createdAt),
    index('push_batches_user_created_idx').on(t.userId, t.createdAt),
    index('push_batches_expiry_idx').on(t.expiresAt),
  ],
);
