import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const platformEnum = ['ios', 'android'] as const;
export type Platform = (typeof platformEnum)[number];

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    installationId: text('installation_id').notNull(),
    platform: text('platform', { enum: platformEnum }).notNull(),
    pushToken: text('push_token').notNull(),
    voipToken: text('voip_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('devices_user_installation_key').on(table.userId, table.installationId)],
);
