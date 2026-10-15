import { Injectable } from '@nestjs/common';

import type { RegisterDeviceDto } from './dto';
import { DevicesRepository } from './repository';
import { tokenFingerprint } from './targets/credential-fingerprint';

@Injectable()
export class DevicesService {
  constructor(private readonly devicesRepository: DevicesRepository) {}

  register(userId: string, { releaseKey, ...device }: RegisterDeviceDto): Promise<void> {
    const releaseKeyHash = releaseKey ? tokenFingerprint(releaseKey) : null;
    return this.devicesRepository.register(userId, { ...device, releaseKeyHash });
  }

  unregister(userId: string, installationId: string): Promise<void> {
    return this.devicesRepository.unregister(userId, installationId);
  }

  /** Only the phone holding the key it registered with can take itself off, no session needed. */
  release(installationId: string, releaseKey: string): Promise<void> {
    return this.devicesRepository.releaseByKey(installationId, tokenFingerprint(releaseKey));
  }
}
