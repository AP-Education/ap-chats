import type { RegisterDeviceDto } from '../dto/register-device.dto';
import type { DeviceRecord } from '../types';

export abstract class DevicesRepository {
  abstract register(userId: string, dto: RegisterDeviceDto): Promise<void>;
  abstract unregister(userId: string, installationId: string): Promise<void>;
  abstract listForUser(userId: string): Promise<DeviceRecord[]>;
}
