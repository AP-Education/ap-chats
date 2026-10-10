import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgTable, primaryKey, unique, uuid } from 'drizzle-orm/pg-core';

import { channels } from './channels';
import { workspaceMembers } from './workspace-members';

export const directMessages = pgTable(
  'direct_messages',
  {
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    firstMemberId: uuid('first_member_id').notNull(),
    secondMemberId: uuid('second_member_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.channelId] }),
    unique('direct_messages_pair_key').on(
      table.workspaceId,
      table.firstMemberId,
      table.secondMemberId,
    ),
    index('direct_messages_first_member_idx').on(table.workspaceId, table.firstMemberId),
    index('direct_messages_second_member_idx').on(table.workspaceId, table.secondMemberId),
    check(
      'direct_messages_pair_order_check',
      sql`${table.firstMemberId} < ${table.secondMemberId}`,
    ),
    foreignKey({
      columns: [table.workspaceId, table.channelId],
      foreignColumns: [channels.workspaceId, channels.id],
      name: 'direct_messages_channel_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.firstMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'direct_messages_first_member_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.secondMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'direct_messages_second_member_fk',
    }).onDelete('cascade'),
  ],
);
