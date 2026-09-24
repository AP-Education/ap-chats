import { useAuthStore } from '../../auth';
import { unregisterDevice } from './devices-api';
import { getInstallationId } from './installation-id';

export async function unregisterCurrentDevice(): Promise<void> {
  const state = useAuthStore.getState();
  if (state.status !== 'signed-in') return;
  const installationId = await getInstallationId();
  await unregisterDevice(state.tokens.accessToken, installationId).catch(() => {});
}
