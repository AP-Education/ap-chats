import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '../../auth';
import { loadCallKitModule } from '../../calls/utils/callkit-module';
import { dismissPresentedNotifications } from '../api/presented-notifications';
import { registerCurrentDeviceForPush } from '../api/register-current-device';
import { unregisterCurrentDevice } from '../api/unregister-current-device';

export function PushRegistration() {
  const status = useAuthStore((state) => state.status);
  const accessToken = useAuthStore((state) =>
    state.status === 'signed-in' ? state.tokens.accessToken : null,
  );
  const sessionToken = useRef<string | null>(null);

  // A logout and a failed refresh both end the session; either way this phone stops getting pushes.
  useEffect(() => {
    const endedToken = accessToken ? null : sessionToken.current;
    sessionToken.current = accessToken;

    if (!endedToken) return;

    void unregisterCurrentDevice(endedToken);
    // The previous account's previews must not stay on screen for whoever uses the phone next.
    void dismissPresentedNotifications();
  }, [accessToken]);

  // Registration calls are already serialized; a failure simply retries the next time the app opens.
  useEffect(() => {
    if (status !== 'signed-in') return;

    let cancelled = false;
    let voipSubscription: { remove(): void } | undefined;
    const register = () => {
      if (cancelled) return;

      void registerCurrentDeviceForPush().catch((error: unknown) => {
        if (__DEV__) console.warn('[push] registration retries on next foreground', error);
      });
    };

    register();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') register();
    });
    const pushToken = Notifications.addPushTokenListener(register);
    void loadCallKitModule().then((CallKit) => {
      if (!CallKit || cancelled) return;

      voipSubscription = CallKit.addVoIPPushTokenUpdatedListener(register);
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
