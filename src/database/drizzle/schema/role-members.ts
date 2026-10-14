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

// How a person shows by their roles, read wherever they appear: the first hoisted role, which
// groups them in member lists, and the first coloured one, which colours their name.
export const memberRolePresentation = pgView('member_role_presentation', {
  memberId: uuid('member_id').notNull(),
  hoistedRoleId: uuid('hoisted_role_id'),
  roleColor: text('role_color'),
}).as(sql`
  select m.id as member_id,
    (select held.role_id from active_role_members held
      where held.member_id = m.id and held.is_hoisted
      order by held.position, held.name limit 1) as hoisted_role_id,
    (select held.color from active_role_members held
      where held.member_id = m.id and held.color is not null
      order by held.position, held.name limit 1) as role_color
  from workspace_members m
  where m.status = 'active'
`);
