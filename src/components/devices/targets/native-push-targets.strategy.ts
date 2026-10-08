import { Injectable } from '@nestjs/common';

import { DevicesRepository } from '../repository';
import type { DeviceRecord } from '../types';
import { tokenFingerprint } from './credential-fingerprint';
import type { CallTargetReference, DeviceTarget } from './types';

@Injectable()
export class NativePushTargetsStrategy {
  constructor(private readonly repository: DevicesRepository) {}

  async listMessageTargetsForUser(userId: string): Promise<DeviceTarget[]> {
    const devices = await this.repository.listForUser(userId);
    const targets: DeviceTarget[] = [];

    for (const device of devices) {
      if (!device.pushToken) continue;

      targets.push({
        id: device.id,
        fingerprint: tokenFingerprint(device.pushToken),
      });
    }

    return targets;
  }

  async listCallTargetsForUsers(userIds: string[]): Promise<CallTargetReference[]> {
    const devices = await this.repository.listForUsers(userIds);
    const targets: CallTargetReference[] = [];

    for (const device of devices) {
      if (!device.voipToken) continue;

      targets.push({
        id: device.id,
        userId: device.userId,
        fingerprint: tokenFingerprint(device.voipToken),
      });
    }

    return targets;
  }

  async findCurrentDevice(
    target: DeviceTarget,
    userId: string,
    kind: 'push' | 'voip',
  ): Promise<DeviceRecord | undefined> {
    const device = await this.repository.find(target.id);
    if (!device || device.userId !== userId) return undefined;

    const token = kind === 'push' ? device.pushToken : device.voipToken;
    if (!token || tokenFingerprint(token) !== target.fingerprint) return undefined;

    return device;
  }

  invalidateTokenIfCurrent(device: DeviceRecord, kind: 'push' | 'voip'): Promise<void> {
    const token = kind === 'push' ? device.pushToken : device.voipToken;
    if (!token) return Promise.resolve();

    return this.repository.invalidateToken(device.id, token, kind);
  }
}
