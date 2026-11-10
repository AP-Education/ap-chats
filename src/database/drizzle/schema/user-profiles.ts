import { boolean, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const localeEnum = ['uk', 'en'] as const;
export type Locale = (typeof localeEnum)[number];

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    oidcUserId: text('oidc_user_id').notNull(),
    displayName: text('display_name'),
    avatarPath: text('avatar_path'),
    // A bot has no sign-in: its oidc_user_id is a reserved subject such as bot:star-me.
    isBot: boolean('is_bot').notNull().default(false),
    // The interface language the person last chose, so what reaches them outside the app speaks it too.
    locale: text('locale', { enum: localeEnum }).notNull().default('uk'),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
  },
  (table) => [unique('user_profiles_oidc_user_id_key').on(table.oidcUserId)],
);
