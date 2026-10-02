import type { Platform } from '@/database/drizzle/schema';

export interface DeviceRecord {
  id: string;
  userId: string;
  installationId: string;
  platform: Platform;
  pushToken: string;
  voipToken: string | null;
}
