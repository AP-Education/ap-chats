import { Platform } from 'react-native';

import { useAuthStore } from '../../auth';
import { loadCallKitModule } from '../../calls/utils/callkit-module';
import type { RegisterDevicePayload } from '../types';
import { DevicesApiError, registerDevice } from './devices-api';
import { getInstallationId } from './installation-id';
import { getExpoPushToken } from './push-token';

// Best-effort: no permission yet, no EAS project, Expo Go — all resolve to a silent no-op.
export async function registerCurrentDeviceForPush(): Promise<void> {
  const state = useAuthStore.getState();
  if (state.status !== 'signed-in') return;

  const [installationId, pushToken] = await Promise.all([getInstallationId(), getExpoPushToken()]);
  if (!pushToken) return;

  const CallKit = await loadCallKitModule();
  const payload: RegisterDevicePayload = {
    installationId,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    pushToken,
    // undefined on a fresh install, before registerVoIPPush() resolves — PushRegistration
    // retries this whole function once addVoIPPushTokenUpdatedListener fires, so it's filled
    // in shortly after. JSON.stringify drops an undefined key, so this is safe to send as-is.
    voipToken: CallKit?.getVoIPPushToken()?.token,
  };

  try {
    await registerDevice(state.tokens.accessToken, payload);
  } catch (error) {
    // A stale token (e.g. the scheduled refresh missed a backgrounded app) — refresh
    // once, directly, and retry. No bridge round trip needed, this is already native.
    if (!(error instanceof DevicesApiError) || error.status !== 401) throw error;
    await useAuthStore.getState().refreshNow();
    const refreshed = useAuthStore.getState();
    if (refreshed.status === 'signed-in') {
      await registerDevice(refreshed.tokens.accessToken, payload);
    }
  }
}
