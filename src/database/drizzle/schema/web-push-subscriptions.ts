import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

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
    activeWorkspaceId: uuid('active_workspace_id'),
    activeChannelId: uuid('active_channel_id'),
    activeUntil: timestamp('active_until', { withTimezone: true }),
  },
  (table) => [unique('web_push_endpoint_key').on(table.endpoint)],
);
