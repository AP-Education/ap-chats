import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DrizzleService } from '../../../database/drizzle';
import { devices } from '../../../database/drizzle/schema';
import type { RegisterDeviceDto } from '../dto/register-device.dto';
import { DevicesRepository } from './devices.repository';

@Injectable()
export class DrizzleDevicesRepository extends DevicesRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async register(userId: string, dto: RegisterDeviceDto): Promise<void> {
    await this.drizzle.db
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
    await this.drizzle.db
      .delete(devices)
      .where(and(eq(devices.userId, userId), eq(devices.installationId, installationId)));
  }
}
