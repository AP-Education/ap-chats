import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { roles } from './roles';
import { workspaceMembers } from './workspace-members';

export const roleMembers = pgTable(
  'role_members',
  {
    workspaceId: uuid('workspace_id').notNull(),
    roleId: uuid('role_id').notNull(),
    memberId: uuid('member_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.memberId] }),
    index('role_members_member_idx').on(table.memberId),
    foreignKey({
      columns: [table.workspaceId, table.roleId],
      foreignColumns: [roles.workspaceId, roles.id],
      name: 'role_members_role_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.memberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'role_members_member_workspace_fk',
    }),
  ],
);

// One row per active person in a role, with how the role shows; the only definition of who holds one.
export const activeRoleMembers = pgView('active_role_members', {
  workspaceId: uuid('workspace_id').notNull(),
  roleId: uuid('role_id').notNull(),
  memberId: uuid('member_id').notNull(),
  name: text('name').notNull(),
  color: text('color'),
  position: integer('position').notNull(),
  isHoisted: boolean('is_hoisted').notNull(),
}).as(sql`
  select rm.workspace_id, rm.role_id, rm.member_id, r.name, r.color, r.position, r.is_hoisted
  from role_members rm
  join roles r on r.id = rm.role_id
  join workspace_members m on m.id = rm.member_id and m.status = 'active'
`);
