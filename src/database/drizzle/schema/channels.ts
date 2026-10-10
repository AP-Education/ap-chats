import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
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

const channelKinds = ['public', 'private', 'dm'] as const;

export const channels = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id'),
    kind: text('kind', { enum: channelKinds }).notNull(),
    name: text('name'),
    createdByMemberId: uuid('created_by_member_id').notNull(),
    lastEntrySeq: bigint('last_entry_seq', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('channels_workspace_id_key').on(table.workspaceId, table.id),
    uniqueIndex('channels_workspace_name_key')
      .on(table.workspaceId, sql`lower(${table.name})`)
      .where(sql`${table.kind} in ('public', 'private')`),
    index('channels_dm_activity_idx').on(table.workspaceId, table.kind, table.updatedAt, table.id),
    check('channels_kind_check', sql`${table.kind} in ('public', 'private', 'dm')`),
    check(
      'channels_name_kind_check',
      sql`(${table.kind} = 'dm' and ${table.name} is null and ${table.categoryId} is null) or (${table.kind} in ('public', 'private') and ${table.name} is not null)`,
    ),
    foreignKey({
      columns: [table.workspaceId, table.categoryId],
      foreignColumns: [channelCategories.workspaceId, channelCategories.id],
      name: 'channels_category_workspace_fk',
    }),
    foreignKey({
      columns: [table.workspaceId, table.createdByMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'channels_creator_workspace_fk',
    }).onDelete('cascade'),
  ],
);
