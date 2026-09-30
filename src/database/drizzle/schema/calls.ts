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

import { channels } from './channels';
import { workspaceMembers } from './workspace-members';
import { workspaces } from './workspaces';

// 'ringing' -> 'active' | 'declined' | 'missed'; 'active' -> 'ended'. Enforced in
// CallsService, not the DB: a check constraint on the value, not the transition.
export const callStatusEnum = ['ringing', 'active', 'ended', 'declined', 'missed'] as const;
export type CallStatus = (typeof callStatusEnum)[number];

export const calls = pgTable(
  'calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').notNull(),
    // room-<call id>: unique by construction, no naming collision to guard against.
    roomName: text('room_name').notNull().unique(),
    status: text('status', { enum: callStatusEnum }).notNull().default('ringing'),
    startedByMemberId: uuid('started_by_member_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    // At most one ringing/active call per channel at a time.
    uniqueIndex('calls_channel_active_key')
      .on(table.channelId)
      .where(sql`${table.status} in ('ringing', 'active')`),
    // Lets channel_entries reference a call by (workspace, channel, id).
    unique('calls_workspace_channel_id_key').on(table.workspaceId, table.channelId, table.id),
    foreignKey({
      columns: [table.workspaceId, table.channelId],
      foreignColumns: [channels.workspaceId, channels.id],
      name: 'calls_channel_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workspaceId, table.startedByMemberId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.id],
      name: 'calls_started_by_workspace_fk',
    }),
    check(
      'calls_status_check',
      sql`${table.status} in ('ringing', 'active', 'ended', 'declined', 'missed')`,
    ),
  ],
);
