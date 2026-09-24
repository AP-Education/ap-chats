export type DevicePlatform = 'ios' | 'android';

export interface RegisterDevicePayload {
  installationId: string;
  platform: DevicePlatform;
  pushToken: string;
  voipToken?: string;
}
