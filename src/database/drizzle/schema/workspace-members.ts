import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { workspaces } from './workspaces';

export const workspaceMemberRoleEnum = ['owner', 'member'] as const;
export type WorkspaceMemberRole = (typeof workspaceMemberRoleEnum)[number];

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role', { enum: workspaceMemberRoleEnum }).notNull().default('member'),
    status: text('status', { enum: ['active', 'removed'] })
      .notNull()
      .default('active'),
    leftAt: timestamp('left_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('workspace_members_workspace_user_key').on(table.workspaceId, table.userId),
    unique('workspace_members_workspace_id_key').on(table.workspaceId, table.id),
  ],
);
