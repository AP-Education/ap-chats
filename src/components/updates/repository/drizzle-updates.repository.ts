import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, gt, lt, ne, sql } from 'drizzle-orm';

import {
  appRuntimes,
  appUpdateLaunchStats,
  appUpdates,
  type AppUpdateStatus,
  type ShellPlatform,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type {
  AppUpdateSummary,
  LaunchReport,
  NewAppUpdate,
  OfferedAppUpdate,
  StoredAppUpdate,
  UpdateListFilter,
  UpdateTarget,
} from '../types';
import { UpdatesRepository } from './updates.repository';

@Injectable()
export class DrizzleUpdatesRepository extends UpdatesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  findOffered({ platform, channel, runtimeVersion }: UpdateTarget): Promise<OfferedAppUpdate[]> {
    return this.txHost.tx
      .select({
        id: appUpdates.id,
        kind: appUpdates.kind,
        runtimeVersion: appUpdates.runtimeVersion,
        manifest: appUpdates.manifest,
        rolloutPercent: appUpdates.rolloutPercent,
        mandatory: appUpdates.mandatory,
        createdAt: appUpdates.createdAt,
      })
      .from(appUpdates)
      .where(
        and(
          eq(appUpdates.platform, platform),
          eq(appUpdates.channel, channel),
          eq(appUpdates.runtimeVersion, runtimeVersion),
          eq(appUpdates.status, 'active'),
        ),
      )
      .orderBy(desc(appUpdates.createdAt), desc(appUpdates.id));
  }

  async countLaunch(launch: LaunchReport, day: string): Promise<void> {
    if (!(await this.isPublished(launch))) return;

    const successes = launch.ok ? 1 : 0;
    const emergencyLaunches = launch.isEmergencyLaunch ? 1 : 0;
    await this.txHost.tx
      .insert(appUpdateLaunchStats)
      .values({
        platform: launch.platform,
        runtimeVersion: launch.runtimeVersion,
        updateId: launch.updateId,
        day,
        launches: 1,
        successes,
        emergencyLaunches,
      })
      .onConflictDoUpdate({
        target: [
          appUpdateLaunchStats.platform,
          appUpdateLaunchStats.runtimeVersion,
          appUpdateLaunchStats.updateId,
          appUpdateLaunchStats.day,
        ],
        set: {
          launches: sql`${appUpdateLaunchStats.launches} + 1`,
          successes: sql`${appUpdateLaunchStats.successes} + ${successes}`,
          emergencyLaunches: sql`${appUpdateLaunchStats.emergencyLaunches} + ${emergencyLaunches}`,
        },
      });
  }

  async registerRuntime(
    platform: ShellPlatform,
    runtimeVersion: string,
    buildNumber: number,
  ): Promise<void> {
    await this.txHost.tx
      .insert(appRuntimes)
      .values({ platform, runtimeVersion, buildNumber })
      .onConflictDoNothing();
  }

  async hasRuntime(platform: ShellPlatform, runtimeVersion: string): Promise<boolean> {
    const [found] = await this.txHost.tx
      .select({ runtimeVersion: appRuntimes.runtimeVersion })
      .from(appRuntimes)
      .where(
        and(eq(appRuntimes.platform, platform), eq(appRuntimes.runtimeVersion, runtimeVersion)),
      )
      .limit(1);
    return Boolean(found);
  }

  async create(update: NewAppUpdate): Promise<string> {
    const [created] = await this.txHost.tx
      .insert(appUpdates)
      .values(update)
      .returning({ id: appUpdates.id });
    return created!.id;
  }

  async list({ channel, platform, limit }: UpdateListFilter): Promise<AppUpdateSummary[]> {
    const stats = this.txHost.tx
      .select({
        updateId: appUpdateLaunchStats.updateId,
        launches: sql<number>`sum(${appUpdateLaunchStats.launches})::int`.as('launches'),
        successes: sql<number>`sum(${appUpdateLaunchStats.successes})::int`.as('successes'),
        emergencyLaunches: sql<number>`sum(${appUpdateLaunchStats.emergencyLaunches})::int`.as(
          'emergency_launches',
        ),
      })
      .from(appUpdateLaunchStats)
      .groupBy(appUpdateLaunchStats.updateId)
      .as('stats');

    return this.txHost.tx
      .select({
        id: appUpdates.id,
        kind: appUpdates.kind,
        platform: appUpdates.platform,
        channel: appUpdates.channel,
        runtimeVersion: appUpdates.runtimeVersion,
        buildNumber: appRuntimes.buildNumber,
        rolloutPercent: appUpdates.rolloutPercent,
        status: appUpdates.status,
        mandatory: appUpdates.mandatory,
        sourceUpdateId: appUpdates.sourceUpdateId,
        gitCommit: appUpdates.gitCommit,
        notes: appUpdates.notes,
        createdBy: appUpdates.createdBy,
        createdAt: appUpdates.createdAt,
        launches: sql<number>`coalesce(${stats.launches}, 0)`,
        successes: sql<number>`coalesce(${stats.successes}, 0)`,
        emergencyLaunches: sql<number>`coalesce(${stats.emergencyLaunches}, 0)`,
      })
      .from(appUpdates)
      .innerJoin(
        appRuntimes,
        and(
          eq(appRuntimes.platform, appUpdates.platform),
          eq(appRuntimes.runtimeVersion, appUpdates.runtimeVersion),
        ),
      )
      .leftJoin(stats, eq(stats.updateId, appUpdates.id))
      .where(
        and(
          eq(appUpdates.channel, channel),
          platform ? eq(appUpdates.platform, platform) : undefined,
        ),
      )
      .orderBy(desc(appUpdates.createdAt), desc(appUpdates.id))
      .limit(limit);
  }

  async find(id: string): Promise<StoredAppUpdate | undefined> {
    const [found] = await this.selectStored().where(eq(appUpdates.id, id)).limit(1);
    return found;
  }

  async setRollout(id: string, rolloutPercent: number): Promise<boolean> {
    const changed = await this.txHost.tx
      .update(appUpdates)
      .set({ rolloutPercent, status: 'active' })
      .where(and(eq(appUpdates.id, id), ne(appUpdates.status, 'revoked')))
      .returning({ id: appUpdates.id });
    return changed.length > 0;
  }

  async setStatus(id: string, status: AppUpdateStatus): Promise<boolean> {
    // A concurrent write to the row waits for this one, then sees `revoked` and changes nothing.
    const changed = await this.txHost.tx
      .update(appUpdates)
      .set({ status })
      .where(and(eq(appUpdates.id, id), ne(appUpdates.status, 'revoked')))
      .returning({ id: appUpdates.id });
    return changed.length > 0;
  }

  async findPreviousBundle(update: StoredAppUpdate): Promise<StoredAppUpdate | undefined> {
    const [found] = await this.selectStored()
      .where(
        and(
          eq(appUpdates.platform, update.platform),
          eq(appUpdates.channel, update.channel),
          eq(appUpdates.runtimeVersion, update.runtimeVersion),
          eq(appUpdates.kind, 'update'),
          eq(appUpdates.status, 'active'),
          gt(appUpdates.rolloutPercent, 0),
          ne(appUpdates.id, update.id),
          lt(appUpdates.createdAt, update.createdAt),
        ),
      )
      .orderBy(desc(appUpdates.createdAt), desc(appUpdates.id))
      .limit(1);
    return found;
  }

  private selectStored() {
    return this.txHost.tx
      .select({
        id: appUpdates.id,
        kind: appUpdates.kind,
        status: appUpdates.status,
        platform: appUpdates.platform,
        channel: appUpdates.channel,
        runtimeVersion: appUpdates.runtimeVersion,
        manifest: appUpdates.manifest,
        createdAt: appUpdates.createdAt,
      })
      .from(appUpdates);
  }

  private async isPublished({
    platform,
    runtimeVersion,
    updateId,
  }: LaunchReport): Promise<boolean> {
    const [found] = updateId
      ? await this.txHost.tx
          .select({ id: appUpdates.id })
          .from(appUpdates)
          .where(
            and(
              eq(appUpdates.id, updateId),
              eq(appUpdates.platform, platform),
              eq(appUpdates.runtimeVersion, runtimeVersion),
            ),
          )
          .limit(1)
      : await this.txHost.tx
          .select({ id: appRuntimes.runtimeVersion })
          .from(appRuntimes)
          .where(
            and(eq(appRuntimes.platform, platform), eq(appRuntimes.runtimeVersion, runtimeVersion)),
          )
          .limit(1);
    return Boolean(found);
  }
}
