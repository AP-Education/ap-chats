import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { devices, type Platform, platformEnum } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { DeviceRecord, DeviceRegistration } from '../types';
import { DevicesRepository } from './devices.repository';

@Injectable()
export class DrizzleDevicesRepository extends DevicesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async register(userId: string, registration: DeviceRegistration): Promise<void> {
    await this.txHost.tx
      .insert(devices)
      .values({
        userId,
        ...registration,
        pushToken: registration.pushToken ?? null,
        voipToken: registration.voipToken ?? null,
      })
      .onConflictDoUpdate({
        target: devices.installationId,
        set: {
          userId,
          platform: registration.platform,
          pushToken: registration.pushToken,
          voipToken: registration.voipToken,
          apnsEnvironment: registration.apnsEnvironment ?? 'production',
          releaseKeyHash: registration.releaseKeyHash,
          updatedAt: new Date(),
        },
      });
  }

  async unregister(userId: string, installationId: string): Promise<void> {
    await this.txHost.tx
      .delete(devices)
      .where(and(eq(devices.userId, userId), eq(devices.installationId, installationId)));
  }

  async releaseByKey(installationId: string, releaseKeyHash: string): Promise<void> {
    await this.txHost.tx
      .delete(devices)
      .where(
        and(eq(devices.installationId, installationId), eq(devices.releaseKeyHash, releaseKeyHash)),
      );
  }

  listForUser(userId: string): Promise<DeviceRecord[]> {
    return this.listForUsers([userId]);
  }

  async listForUsers(userIds: string[]): Promise<DeviceRecord[]> {
    if (!userIds.length) return [];
    return this.txHost.tx
      .select({
        id: devices.id,
        userId: devices.userId,
        installationId: devices.installationId,
        platform: sql<Platform>`${devices.platform}`,
        pushToken: devices.pushToken,
        voipToken: devices.voipToken,
        apnsEnvironment: devices.apnsEnvironment,
      })
      .from(devices)
      .where(and(inArray(devices.userId, userIds), inArray(devices.platform, [...platformEnum])));
  }

  async find(id: string): Promise<DeviceRecord | undefined> {
    const [device] = await this.txHost.tx.select().from(devices).where(eq(devices.id, id));
    if (!device || device.platform === 'web') return undefined;
    return { ...device, platform: device.platform };
  }

  async invalidateToken(id: string, token: string, kind: 'push' | 'voip'): Promise<void> {
    const column = kind === 'push' ? devices.pushToken : devices.voipToken;
    await this.txHost.tx
      .update(devices)
      .set(kind === 'push' ? { pushToken: null } : { voipToken: null })
      .where(and(eq(devices.id, id), eq(column, token)));
  }
}
