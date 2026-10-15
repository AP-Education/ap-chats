import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { userProfiles } from './user-profiles';
import { workspaces } from './workspaces';

export const workspaceAccessLevels = ['owner', 'manager', 'member'] as const;
export type WorkspaceAccessLevel = (typeof workspaceAccessLevels)[number];

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userProfileId: uuid('user_profile_id')
      .notNull()
      .references(() => userProfiles.id),
    accessLevel: text('access_level', { enum: workspaceAccessLevels }).notNull().default('member'),
    status: text('status', { enum: ['active', 'removed'] })
      .notNull()
      .default('active'),
    leftAt: timestamp('left_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('workspace_members_workspace_profile_key').on(table.workspaceId, table.userProfileId),
    unique('workspace_members_workspace_id_key').on(table.workspaceId, table.id),
  ],
);
