import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { workspaces } from './workspaces';

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'),
    // Display order only, top first; it never decides what anyone may do.
    position: integer('position').notNull().default(0),
    isHoisted: boolean('is_hoisted').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('roles_workspace_id_key').on(table.workspaceId, table.id),
    uniqueIndex('roles_workspace_name_key').on(table.workspaceId, sql`lower(${table.name})`),
  ],
);
