import { useEffect } from 'react';

import { useAuthStore } from '../../auth';
import { loadCallKitModule } from '../../calls/utils/callkit-module';
import { registerCurrentDeviceForPush } from '../api/register-current-device';

function tryRegister(): void {
  void registerCurrentDeviceForPush().catch((error: unknown) => {
    if (__DEV__) console.warn('[push] registerDevice failed', error);
  });
}

// Tries once per sign-in — a no-op if permission was never granted (see
// PushPrimingGate for the only place that actually requests it).
export function PushRegistration() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status !== 'signed-in') return;
    tryRegister();
  }, [status]);

  // Independent of sign-in: the native VoIP token can arrive (or rotate) at any
  // time and each arrival needs re-sending, while registerCurrentDeviceForPush
  // itself already no-ops if we're not signed in yet.
  useEffect(() => {
    let cancelled = false;
    let subscription: { remove(): void } | undefined;

    void loadCallKitModule().then((CallKit) => {
      if (!CallKit || cancelled) return;
      CallKit.registerVoIPPush();
      subscription = CallKit.addVoIPPushTokenUpdatedListener(tryRegister);
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return null;
}
