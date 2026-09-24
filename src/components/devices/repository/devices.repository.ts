import type { RegisterDeviceDto } from '../dto/register-device.dto';

export abstract class DevicesRepository {
  abstract register(userId: string, dto: RegisterDeviceDto): Promise<void>;
  abstract unregister(userId: string, installationId: string): Promise<void>;
}
