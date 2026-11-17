import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, sql } from 'drizzle-orm';

import { appRuntimes, appUpdateLaunchStats, appUpdates } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { LaunchReport, OfferedAppUpdate, UpdateTarget } from '../types';
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
