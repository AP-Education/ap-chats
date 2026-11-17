import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const shellPlatformEnum = ['ios', 'android'] as const;
export type ShellPlatform = (typeof shellPlatformEnum)[number];

export const updateChannelEnum = ['production', 'preview'] as const;
export type UpdateChannel = (typeof updateChannelEnum)[number];

export const appUpdateKindEnum = ['update', 'rollback_to_embedded'] as const;
export type AppUpdateKind = (typeof appUpdateKindEnum)[number];

export const appUpdateStatusEnum = ['active', 'paused', 'revoked'] as const;
export type AppUpdateStatus = (typeof appUpdateStatusEnum)[number];

/** One file of an exported bundle, already uploaded under its content hash. */
export interface StoredUpdateAsset {
  /** Base64url SHA-256 of the file, as the Expo Updates protocol expects. */
  hash: string;
  /** The client's cache key for the file; the hex MD5 `expo export` names it by. */
  key: string;
  contentType: string;
  fileExtension?: string;
  url: string;
}

export interface StoredUpdateManifest {
  launchAsset: StoredUpdateAsset;
  assets: StoredUpdateAsset[];
}

/** A native build in the stores, by the fingerprint of its native layer. */
export const appRuntimes = pgTable(
  'app_runtimes',
  {
    platform: text('platform', { enum: shellPlatformEnum }).notNull(),
    runtimeVersion: text('runtime_version').notNull(),
    buildNumber: integer('build_number').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'app_runtimes_pkey', columns: [table.platform, table.runtimeVersion] }),
    check('app_runtimes_build_number_check', sql`${table.buildNumber} >= 1`),
  ],
);

/**
 * What a shell on one runtime and channel is offered: a JS bundle, or the instruction to go
 * back to the bundle embedded in its binary. Rows are never rewritten into older content;
 * a rollback publishes a new row.
 */
export const appUpdates = pgTable(
  'app_updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind', { enum: appUpdateKindEnum }).notNull().default('update'),
    platform: text('platform', { enum: shellPlatformEnum }).notNull(),
    channel: text('channel', { enum: updateChannelEnum }).notNull(),
    runtimeVersion: text('runtime_version').notNull(),
    manifest: jsonb('manifest').$type<StoredUpdateManifest>(),
    rolloutPercent: integer('rollout_percent').notNull(),
    status: text('status', { enum: appUpdateStatusEnum }).notNull().default('active'),
    mandatory: boolean('mandatory').notNull().default(false),
    sourceUpdateId: uuid('source_update_id'),
    gitCommit: text('git_commit'),
    notes: text('notes'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.platform, table.runtimeVersion],
      foreignColumns: [appRuntimes.platform, appRuntimes.runtimeVersion],
      name: 'app_updates_runtime_fk',
    }),
    foreignKey({
      columns: [table.sourceUpdateId],
      foreignColumns: [table.id],
      name: 'app_updates_source_fk',
    }),
    index('app_updates_offered_idx')
      .on(table.platform, table.channel, table.runtimeVersion, table.createdAt)
      .where(sql`${table.status} = 'active'`),
    check('app_updates_rollout_percent_check', sql`${table.rolloutPercent} BETWEEN 0 AND 100`),
    check(
      'app_updates_manifest_check',
      sql`(${table.kind} = 'update') = (${table.manifest} IS NOT NULL)`,
    ),
  ],
);

/** Daily launch counts per shipped bundle; a null update is the bundle embedded in the binary. */
export const appUpdateLaunchStats = pgTable(
  'app_update_launch_stats',
  {
    platform: text('platform', { enum: shellPlatformEnum }).notNull(),
    runtimeVersion: text('runtime_version').notNull(),
    updateId: uuid('update_id'),
    day: date('day', { mode: 'string' }).notNull(),
    launches: integer('launches').notNull().default(0),
    successes: integer('successes').notNull().default(0),
    emergencyLaunches: integer('emergency_launches').notNull().default(0),
  },
  (table) => [
    unique('app_update_launch_stats_key')
      .on(table.platform, table.runtimeVersion, table.updateId, table.day)
      .nullsNotDistinct(),
    index('app_update_launch_stats_update_idx').on(table.updateId),
  ],
);
