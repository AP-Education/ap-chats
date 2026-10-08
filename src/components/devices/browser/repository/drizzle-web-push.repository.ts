import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { devices, webPushSubscriptions } from '@/database/drizzle/schema';

import type { WebPushRegistration, WebPushSubscription } from '../web-push.types';
import { WebPushRepository } from './web-push.repository';

const selection = {
  id: webPushSubscriptions.id,
  endpoint: webPushSubscriptions.endpoint,
  p256dh: webPushSubscriptions.p256dh,
  auth: webPushSubscriptions.auth,
  userId: devices.userId,
  createdAt: devices.createdAt,
  updatedAt: devices.updatedAt,
};

@Injectable()
export class DrizzleWebPushRepository extends WebPushRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  @Transactional()
  async register(userId: string, dto: WebPushRegistration): Promise<{ id: string }> {
    await this.txHost.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${dto.endpoint}, 0))`,
    );
    const [previous] = await this.txHost.tx
      .select({ id: devices.id, installationId: devices.installationId })
      .from(webPushSubscriptions)
      .innerJoin(devices, eq(devices.id, webPushSubscriptions.id))
      .where(eq(webPushSubscriptions.endpoint, dto.endpoint));
    if (previous && previous.installationId !== dto.installationId)
      await this.txHost.tx.delete(devices).where(eq(devices.id, previous.id));
    const [device] = await this.txHost.tx
      .insert(devices)
      .values({ userId, installationId: dto.installationId, platform: 'web' })
      .onConflictDoUpdate({
        target: devices.installationId,
        set: { userId, platform: 'web', pushToken: null, voipToken: null, updatedAt: new Date() },
      })
      .returning({ id: devices.id });
    if (!device) throw new Error('Browser registration failed');
    await this.txHost.tx
      .insert(webPushSubscriptions)
      .values({ id: device.id, endpoint: dto.endpoint, ...dto.keys })
      .onConflictDoUpdate({
        target: webPushSubscriptions.id,
        set: { endpoint: dto.endpoint, ...dto.keys },
      });
    return device;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.txHost.tx
      .delete(devices)
      .where(and(eq(devices.id, id), eq(devices.userId, userId), eq(devices.platform, 'web')));
  }

  async forUser(userId: string): Promise<WebPushSubscription[]> {
    return this.txHost.tx
      .select(selection)
      .from(webPushSubscriptions)
      .innerJoin(devices, eq(devices.id, webPushSubscriptions.id))
      .where(eq(devices.userId, userId));
  }

  async find(id: string): Promise<WebPushSubscription | undefined> {
    const [record] = await this.txHost.tx
      .select(selection)
      .from(webPushSubscriptions)
      .innerJoin(devices, eq(devices.id, webPushSubscriptions.id))
      .where(eq(devices.id, id));
    return record;
  }

  async invalidate(snapshot: WebPushSubscription): Promise<void> {
    await this.txHost.tx.delete(devices).where(
      and(
        eq(devices.id, snapshot.id),
        eq(devices.userId, snapshot.userId),
        eq(devices.platform, 'web'),
        sql`exists (
      select 1 from ${webPushSubscriptions} where ${webPushSubscriptions.id} = ${devices.id}
      and ${webPushSubscriptions.endpoint} = ${snapshot.endpoint} and ${webPushSubscriptions.auth} = ${snapshot.auth} and ${webPushSubscriptions.p256dh} = ${snapshot.p256dh})`,
      ),
    );
  }
}
