import { queueDeviceRegistration } from '../utils/device-registration-queue';
import { unregisterDevice } from './devices-api';
import { getInstallationId } from './installation-id';

/** Takes the ending session's token, since the auth store has already dropped it by now. */
export function unregisterCurrentDevice(accessToken: string): Promise<void> {
  return queueDeviceRegistration(async () => {
    const installationId = await getInstallationId();
    await unregisterDevice(accessToken, installationId).catch(() => {});
  });
}
