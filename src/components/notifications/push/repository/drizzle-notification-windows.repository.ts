import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, count, desc, eq, gt, sql } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { pushBatches } from '@/database/drizzle/schema';

import type { ConversationAlert } from '../types';
import { NotificationWindowsRepository } from './notification-windows.repository';

@Injectable()
export class DrizzleNotificationWindowsRepository extends NotificationWindowsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async latest(userId: string, channelId: string) {
    const [batch] = await this.txHost.tx
      .select()
      .from(pushBatches)
      .where(and(eq(pushBatches.userId, userId), eq(pushBatches.channelId, channelId)))
      .orderBy(desc(pushBatches.createdAt), desc(pushBatches.id))
      .limit(1);
    return batch;
  }

  reserve(alert: ConversationAlert, now: Date, cooldownSeconds: number, userLimit: number) {
    return this.txHost.withTransaction(async () => {
      // One user lock makes both conversation cooldown and the cross-conversation budget atomic.
      await this.txHost.tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${'push-budget:' + alert.userId}, 0))`,
      );
      const [existing] = await this.txHost.tx
        .select()
        .from(pushBatches)
        .where(eq(pushBatches.id, alert.id));
      if (existing)
        return existing.userId === alert.userId && existing.channelId === alert.channelId
          ? existing
          : null;
      const previous = await this.latest(alert.userId, alert.channelId);
      if (
        previous &&
        (previous.lastSeq >= BigInt(alert.lastSeq) ||
          now.getTime() - previous.createdAt.getTime() < cooldownSeconds * 1000)
      )
        return null;
      const [recent] = await this.txHost.tx
        .select({ count: count() })
        .from(pushBatches)
        .where(
          and(
            eq(pushBatches.userId, alert.userId),
            gt(pushBatches.createdAt, new Date(now.getTime() - 60000)),
          ),
        );
      if ((recent?.count ?? 0) >= userLimit) return null;
      const [batch] = await this.txHost.tx
        .insert(pushBatches)
        .values({
          id: alert.id,
          userId: alert.userId,
          channelId: alert.channelId,
          firstSeq: BigInt(alert.firstSeq),
          lastSeq: BigInt(alert.lastSeq),
          expiresAt: new Date(alert.expiresAt),
          createdAt: now,
        })
        .returning();
      await this.txHost.tx.execute(sql`delete from ${pushBatches} where id in
        (select id from ${pushBatches} where expires_at < now() - interval '7 days' limit 1000)`);
      return batch ?? null;
    });
  }
}
