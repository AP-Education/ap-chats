import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '../../auth';
import { loadCallKitModule } from '../../calls/utils/callkit-module';
import { registerCurrentDeviceForPush } from '../api/register-current-device';

export function PushRegistration() {
  const status = useAuthStore((state) => state.status);

  // Registration calls are already serialized; a failure simply retries the next time the app opens.
  useEffect(() => {
    if (status !== 'signed-in') return;

    let cancelled = false;
    let voipSubscription: { remove(): void } | undefined;
    let knownPushToken: string | undefined;
    const register = (devicePushToken?: Notifications.DevicePushToken) => {
      if (cancelled) return;

      void registerCurrentDeviceForPush(devicePushToken).catch((error: unknown) => {
        if (__DEV__) console.warn('[push] registration retries on next foreground', error);
      });
    };

    register();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') register();
    });
    // Asking for the token reports it here as well; only one the push service replaced is news.
    const pushToken = Notifications.addPushTokenListener((token) => {
      if (token.data === knownPushToken) return;

      knownPushToken = token.data;
      register(token);
    });
    void loadCallKitModule().then((CallKit) => {
      if (!CallKit || cancelled) return;

      voipSubscription = CallKit.addVoIPPushTokenUpdatedListener(() => register());
      CallKit.registerVoIPPush();
      register();
    });

    return () => {
      cancelled = true;
      appState.remove();
      pushToken.remove();
      voipSubscription?.remove();
    };
  }, [status]);

  return null;
}
