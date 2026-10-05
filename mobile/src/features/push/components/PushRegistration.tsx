import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '../../auth';
import { loadCallKitModule } from '../../calls/utils/callkit-module';
import { registerCurrentDeviceForPush } from '../api/register-current-device';

export function PushRegistration() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status !== 'signed-in') return;
    let cancelled = false;
    let running = false;
    let rerun = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let voipSubscription: { remove(): void } | undefined;
    const register = async () => {
      if (cancelled) return;
      if (running) {
        rerun = true;
        return;
      }
      running = true;
      clearTimeout(timer);
      try {
        await registerCurrentDeviceForPush();
        attempts = 0;
      } catch (error) {
        if (__DEV__) console.warn('[push] registration will retry', error);
        if (!cancelled)
          timer = setTimeout(() => void register(), Math.min(5000 * 2 ** attempts++, 300000));
      } finally {
        running = false;
        if (rerun) {
          rerun = false;
          void register();
        }
      }
    };
    void register();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void register();
    });
    const nativeToken = Notifications.addPushTokenListener(() => void register());
    void loadCallKitModule().then((CallKit) => {
      if (!CallKit || cancelled) return;
      voipSubscription = CallKit.addVoIPPushTokenUpdatedListener(() => void register());
      CallKit.registerVoIPPush();
      void register();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      appState.remove();
      nativeToken.remove();
      voipSubscription?.remove();
    };
  }, [status]);
  return null;
}
