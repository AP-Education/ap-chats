import { pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

import { devices } from './devices';

export const webPushSubscriptions = pgTable(
  'web_push_subscriptions',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => devices.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
  },
  (table) => [unique('web_push_endpoint_key').on(table.endpoint)],
);
