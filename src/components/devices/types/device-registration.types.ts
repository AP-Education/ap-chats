import type { Platform } from '@/database/drizzle/schema';

/** What a phone registers, its release key kept only as a hash; builds before it send none. */
export interface DeviceRegistration {
  installationId: string;
  platform: Platform;
  pushToken?: string | null;
  voipToken?: string;
  apnsEnvironment?: 'sandbox' | 'production';
  releaseKeyHash: string | null;
}
