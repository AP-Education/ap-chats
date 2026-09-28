import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    oidcUserId: text('oidc_user_id').notNull(),
    displayName: text('display_name'),
    avatarPath: text('avatar_path'),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
  },
  (table) => [unique('user_profiles_oidc_user_id_key').on(table.oidcUserId)],
);
