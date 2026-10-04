import { useAuthStore } from '../../auth';
import { queueDeviceRegistration } from '../utils/device-registration-queue';
import { unregisterDevice } from './devices-api';
import { getInstallationId } from './installation-id';

export async function unregisterCurrentDevice(): Promise<void> {
  const state = useAuthStore.getState();
  if (state.status !== 'signed-in') return;
  // Reserve cleanup before logout changes auth state or another sign-in queues a POST.
  return queueDeviceRegistration(async () => {
    const installationId = await getInstallationId();
    await unregisterDevice(state.tokens.accessToken, installationId).catch(() => {});
  });
}
