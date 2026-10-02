import { Injectable } from '@nestjs/common';

import type { RegisterDeviceDto } from './dto/register-device.dto';
import { DevicesRepository } from './repository';
import type { DeviceRecord } from './types';

@Injectable()
export class DevicesService {
  constructor(private readonly devicesRepository: DevicesRepository) {}

  register(userId: string, dto: RegisterDeviceDto): Promise<void> {
    return this.devicesRepository.register(userId, dto);
  }

  unregister(userId: string, installationId: string): Promise<void> {
    return this.devicesRepository.unregister(userId, installationId);
  }

  listForUser(userId: string): Promise<DeviceRecord[]> {
    return this.devicesRepository.listForUser(userId);
  }
}
