import type { DeviceRecord, DeviceRegistration } from '../types';

export abstract class DevicesRepository {
  abstract register(userId: string, registration: DeviceRegistration): Promise<void>;
  abstract unregister(userId: string, installationId: string): Promise<void>;
  abstract releaseByKey(installationId: string, releaseKeyHash: string): Promise<void>;
  abstract listForUser(userId: string): Promise<DeviceRecord[]>;
  abstract listForUsers(userIds: string[]): Promise<DeviceRecord[]>;
  abstract find(id: string): Promise<DeviceRecord | undefined>;
  abstract invalidateToken(id: string, token: string, kind: 'push' | 'voip'): Promise<void>;
}
