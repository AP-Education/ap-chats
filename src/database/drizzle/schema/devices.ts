import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const platformEnum = ['ios', 'android'] as const;
export type Platform = (typeof platformEnum)[number];

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    installationId: text('installation_id').notNull(),
    platform: text('platform', { enum: [...platformEnum, 'web'] }).notNull(),
    pushToken: text('push_token'),
    voipToken: text('voip_token'),
    apnsEnvironment: text('apns_environment', { enum: ['sandbox', 'production'] })
      .notNull()
      .default('production'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('devices_installation_key').on(table.installationId),
    index('devices_user_idx').on(table.userId),
  ],
);
