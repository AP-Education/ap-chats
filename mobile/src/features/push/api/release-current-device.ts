import { queueDeviceRegistration } from '../utils/device-registration-queue';
import { releaseDevice } from './devices-api';
import { getDeviceReleaseKey, getInstallationId } from './installation-id';
import { forgetCurrentDeviceRegistration } from './register-current-device';

/** The phone stops getting this account's pushes and calls, with or without a session left. */
export function releaseCurrentDevice(): Promise<void> {
  return queueDeviceRegistration(async () => {
    const [installationId, releaseKey] = await Promise.all([
      getInstallationId(),
      getDeviceReleaseKey(),
    ]);
    forgetCurrentDeviceRegistration();
    await releaseDevice(installationId, releaseKey).catch(() => {});
  });
}
