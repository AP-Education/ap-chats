import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { workspaces } from './workspaces';

export const channelCategories = pgTable(
  'channel_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('channel_categories_workspace_id_key').on(table.workspaceId, table.id),
    uniqueIndex('channel_categories_workspace_name_key').on(
      table.workspaceId,
      sql`lower(${table.name})`,
    ),
  ],
);
