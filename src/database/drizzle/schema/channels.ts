import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { channelCategories } from './channel-categories';
import { workspaceMembers } from './workspace-members';
import { workspaces } from './workspaces';

const channelKinds = ['public', 'private'] as const;

export const channels = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id'),
    kind: text('kind', { enum: channelKinds }).notNull(),
    name: text('name').notNull(),
    createdByMemberId: uuid('created_by_member_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('channels_workspace_id_key').on(table.workspaceId, table.id),
    uniqueIndex('channels_workspace_name_key').on(table.workspaceId, sql`lower(${table.name})`),
    check('channels_kind_check', sql`${table.kind} in ('public', 'private')`),
    foreignKey({
      columns: [table.workspaceId, table.categoryId],
      foreignColumns: [channelCategories.workspaceId, channelCategories.id],
      name: 'channels_category_workspace_fk',
    }),
    foreignKey({
      columns: [table.workspaceId, table.createdByMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'channels_creator_workspace_fk',
    }),
  ],
);
