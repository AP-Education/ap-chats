import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { channels } from './channels';
import { workspaceMembers } from './workspace-members';

export const channelMemberships = pgTable(
  'channel_memberships',
  {
    workspaceId: uuid('workspace_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    memberId: uuid('member_id').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    lastReadEntrySeq: bigint('last_read_entry_seq', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    notificationsMuted: boolean('notifications_muted').notNull().default(false),
    mutedUntil: timestamp('muted_until', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.memberId] }),
    index('channel_memberships_member_channel_idx').on(table.memberId, table.channelId),
    foreignKey({
      columns: [table.workspaceId, table.channelId],
      foreignColumns: [channels.workspaceId, channels.id],
      name: 'channel_memberships_channel_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.memberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'channel_memberships_member_workspace_fk',
    }),
  ],
);
