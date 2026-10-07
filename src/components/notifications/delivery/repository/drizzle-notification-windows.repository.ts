import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, count, desc, eq, gt, min, sql } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { notificationWindows } from '@/database/drizzle/schema';

import type { ConversationAlert, NotificationWindow } from '../types';
import {
  NotificationWindowsRepository,
  type WindowLimits,
  type WindowReservation,
} from './notification-windows.repository';

@Injectable()
export class DrizzleNotificationWindowsRepository extends NotificationWindowsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async latest(userId: string, channelId: string) {
    const [batch] = await this.txHost.tx
      .select()
      .from(notificationWindows)
      .where(
        and(eq(notificationWindows.userId, userId), eq(notificationWindows.channelId, channelId)),
      )
      .orderBy(desc(notificationWindows.createdAt), desc(notificationWindows.id))
      .limit(1);
    return batch;
  }

  reserve(alert: ConversationAlert, now: Date, limits: WindowLimits): Promise<WindowReservation> {
    return this.txHost.withTransaction(async () => {
      // One user lock makes both conversation cooldown and the cross-conversation budget atomic.
      await this.txHost.tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${'push-budget:' + alert.userId}, 0))`,
      );

      const [existing] = await this.txHost.tx
        .select()
        .from(notificationWindows)
        .where(eq(notificationWindows.id, alert.id));
      if (existing) {
        const isSameConversation =
          existing.userId === alert.userId && existing.channelId === alert.channelId;
        return isSameConversation ? reserved(existing) : SUPERSEDED;
      }

      const previous = await this.latest(alert.userId, alert.channelId);
      if (previous && previous.lastSeq >= BigInt(alert.lastSeq)) return SUPERSEDED;

      const cooldownEndsAt = previous && addSeconds(previous.createdAt, limits.cooldownSeconds);
      if (cooldownEndsAt && cooldownEndsAt > now) return deferred(cooldownEndsAt);

      if (!limits.urgent) {
        const budgetFreesAt = await this.budgetFreesAt(alert.userId, now, limits);
        if (budgetFreesAt) return deferred(budgetFreesAt);
      }

      const [window] = await this.txHost.tx
        .insert(notificationWindows)
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

      await this.txHost.tx.execute(sql`delete from ${notificationWindows} where id in
        (select id from ${notificationWindows} where expires_at < now() - interval '7 days' limit 1000)`);

      return window ? reserved(window) : SUPERSEDED;
    });
  }

  // When the oldest alert of the last minute ages out, if the budget is spent.
  private async budgetFreesAt(userId: string, now: Date, limits: WindowLimits) {
    const minuteAgo = addSeconds(now, -60);
    const [recent] = await this.txHost.tx
      .select({ count: count(), oldest: min(notificationWindows.createdAt) })
      .from(notificationWindows)
      .where(
        and(eq(notificationWindows.userId, userId), gt(notificationWindows.createdAt, minuteAgo)),
      );

    const isSpent = (recent?.count ?? 0) >= limits.userAlertsPerMinute;
    return isSpent && recent?.oldest ? addSeconds(recent.oldest, 60) : undefined;
  }
}

const SUPERSEDED: WindowReservation = { status: 'superseded' };

const reserved = (window: NotificationWindow): WindowReservation => ({
  status: 'reserved',
  window,
});

const deferred = (until: Date): WindowReservation => ({ status: 'deferred', until });

const addSeconds = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000);
