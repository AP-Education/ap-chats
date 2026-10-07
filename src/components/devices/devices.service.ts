import { Injectable } from '@nestjs/common';

import type { RegisterDeviceDto } from './dto';
import { DevicesRepository } from './repository';

@Injectable()
export class DevicesService {
  constructor(private readonly devicesRepository: DevicesRepository) {}

  register(userId: string, dto: RegisterDeviceDto): Promise<void> {
    return this.devicesRepository.register(userId, dto);
  }

  unregister(userId: string, installationId: string): Promise<void> {
    return this.devicesRepository.unregister(userId, installationId);
  }
}
