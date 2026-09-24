import { useEffect } from 'react';

import { useAuthStore } from '../../auth';
import { registerCurrentDeviceForPush } from '../api/register-current-device';

// Tries once per sign-in — a no-op if permission was never granted (see
// PushPrimingGate for the only place that actually requests it).
export function usePushRegistration(): void {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status !== 'signed-in') return;
    void registerCurrentDeviceForPush().catch((error: unknown) => {
      if (__DEV__) console.warn('[push] registerDevice failed', error);
    });
  }, [status]);
}
