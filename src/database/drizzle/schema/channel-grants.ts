import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  pgView,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { channels } from './channels';
import { roles } from './roles';
import { workspaceMembers } from './workspace-members';

const capabilities = ['view', 'post', 'manage'] as const;
const principals = ['everyone', 'role', 'member'] as const;

export const channelGrants = pgTable(
  'channel_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    capability: text('capability', { enum: capabilities }).notNull(),
    principal: text('principal', { enum: principals }).notNull(),
    roleId: uuid('role_id'),
    memberId: uuid('member_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('channel_grants_principal_key')
      .on(table.channelId, table.capability, table.roleId, table.memberId)
      .nullsNotDistinct(),
    index('channel_grants_role_idx').on(table.roleId),
    index('channel_grants_member_idx').on(table.memberId),
    index('channel_grants_everyone_idx')
      .on(table.workspaceId)
      .where(sql`${table.principal} = 'everyone'`),
    check(
      'channel_grants_principal_check',
      sql`(${table.principal} = 'everyone' and ${table.roleId} is null and ${table.memberId} is null) or (${table.principal} = 'role' and ${table.roleId} is not null and ${table.memberId} is null) or (${table.principal} = 'member' and ${table.memberId} is not null and ${table.roleId} is null)`,
    ),
    foreignKey({
      columns: [table.workspaceId, table.channelId],
      foreignColumns: [channels.workspaceId, channels.id],
      name: 'channel_grants_channel_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.roleId],
      foreignColumns: [roles.workspaceId, roles.id],
      name: 'channel_grants_role_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.memberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'channel_grants_member_workspace_fk',
    }),
  ],
);

// One row per active person and grant that reaches them; the only definition of who a grant covers.
export const channelAccessSources = pgView('channel_access_sources', {
  workspaceId: uuid('workspace_id').notNull(),
  channelId: uuid('channel_id').notNull(),
  memberId: uuid('member_id').notNull(),
  capability: text('capability', { enum: capabilities }).notNull(),
  principal: text('principal', { enum: principals }).notNull(),
  roleId: uuid('role_id'),
}).as(sql`
  select g.workspace_id, g.channel_id, m.id as member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join workspace_members m on m.workspace_id = g.workspace_id and m.status = 'active'
  where g.principal = 'everyone'
  union all
  select g.workspace_id, g.channel_id, rm.member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join active_role_members rm on rm.role_id = g.role_id
  where g.principal = 'role'
  union all
  select g.workspace_id, g.channel_id, g.member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join workspace_members m on m.id = g.member_id and m.status = 'active'
  where g.principal = 'member'
`);

// What a person may do in a channel: a row means they see it; managing implies posting.
export const channelMemberAccess = pgView('channel_member_access', {
  workspaceId: uuid('workspace_id').notNull(),
  channelId: uuid('channel_id').notNull(),
  memberId: uuid('member_id').notNull(),
  canPost: boolean('can_post').notNull(),
  canManage: boolean('can_manage').notNull(),
}).as(sql`
  select workspace_id, channel_id, member_id,
    bool_or(capability <> 'view') as can_post,
    bool_or(capability = 'manage') as can_manage
  from channel_access_sources
  group by workspace_id, channel_id, member_id
`);
