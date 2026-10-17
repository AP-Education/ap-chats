import Constants from 'expo-constants';
import type { DevicePushToken } from 'expo-notifications';
import { Platform } from 'react-native';

import { useAuthStore } from '../../auth';
import { loadCallKitModule } from '../../calls/utils/callkit-module';
import type { RegisterDevicePayload } from '../types';
import { queueDeviceRegistration } from '../utils/device-registration-queue';
import { registerDevice } from './devices-api';
import { getDeviceReleaseKey, getInstallationId } from './installation-id';
import { getExpoPushToken } from './push-token';

// A registration still waiting in the queue reads the newest state once it runs.
let waiting: Promise<void> | null = null;
// What the server last accepted for this phone; the same registration is not sent twice.
let registered: string | null = null;
let reachableByCalls = false;

/** Any number of requests at once make one registration, and an unchanged one makes none. */
export function registerCurrentDeviceForPush(devicePushToken?: DevicePushToken): Promise<void> {
  if (waiting) return waiting;

  waiting = queueDeviceRegistration(async () => {
    waiting = null;
    if (useAuthStore.getState().status !== 'signed-in') return;

    const [installationId, releaseKey, tokenResult] = await Promise.all([
      getInstallationId(),
      getDeviceReleaseKey(),
      getExpoPushToken(devicePushToken).then(
        (token) => ({ token, error: undefined as unknown }),
        (error: unknown) => ({ token: undefined, error }),
      ),
    ]);

    const CallKit = await loadCallKitModule();
    if (useAuthStore.getState().status !== 'signed-in') return;
    const payload: RegisterDevicePayload = {
      installationId,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      pushToken: tokenResult.token,
      apnsEnvironment:
        Constants.expoConfig?.extra?.apnsEnvironment === 'production' ? 'production' : 'sandbox',
      // Missing on a fresh install; PushRegistration registers again when the VoIP token arrives.
      voipToken: CallKit?.getVoIPPushToken()?.token,
      releaseKey,
    };

    const registration = JSON.stringify(payload);
    if (registration !== registered) {
      await registerDevice(payload);
      registered = registration;
    }
    reachableByCalls = Boolean(payload.voipToken);
    if (tokenResult.error) throw tokenResult.error;
  });
  return waiting;
}

/** The phone left the account, so whoever signs in next registers it afresh. */
export function forgetCurrentDeviceRegistration(): void {
  registered = null;
  reachableByCalls = false;
}

/** The server holds this phone's call push token, so a call can ring it. */
export function isReachableByCalls(): boolean {
  return reachableByCalls;
}
