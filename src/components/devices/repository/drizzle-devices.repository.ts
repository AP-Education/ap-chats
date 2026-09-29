import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq } from 'drizzle-orm';

import { devices } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { RegisterDeviceDto } from '../dto/register-device.dto';
import { DevicesRepository } from './devices.repository';

@Injectable()
export class DrizzleDevicesRepository extends DevicesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async register(userId: string, dto: RegisterDeviceDto): Promise<void> {
    await this.txHost.tx
      .insert(devices)
      .values({ userId, ...dto })
      .onConflictDoUpdate({
        target: [devices.userId, devices.installationId],
        set: {
          platform: dto.platform,
          pushToken: dto.pushToken,
          voipToken: dto.voipToken,
          updatedAt: new Date(),
        },
      });
  }

  async unregister(userId: string, installationId: string): Promise<void> {
    await this.txHost.tx
      .delete(devices)
      .where(and(eq(devices.userId, userId), eq(devices.installationId, installationId)));
  }
}
