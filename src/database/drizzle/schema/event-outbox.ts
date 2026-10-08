import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const eventOutbox = pgTable(
  'event_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    priority: integer('priority').notNull().default(10),
    payload: jsonb('payload').$type<object>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    leasedUntil: timestamp('leased_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('event_outbox_pending_idx').on(t.priority, t.createdAt),
    index('event_outbox_expiry_idx').on(t.expiresAt),
  ],
);
