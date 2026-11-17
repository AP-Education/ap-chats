import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq } from 'drizzle-orm';

import { appUpdates } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { OfferedAppUpdate, UpdateTarget } from '../types';
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
}
