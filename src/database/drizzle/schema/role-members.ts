import { foreignKey, index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';

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
