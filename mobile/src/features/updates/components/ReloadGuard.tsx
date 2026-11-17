import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '../../auth/index';
import { useNativeCallStore } from '../../calls/store/native-call-store';
import { useUpdateStore } from '../store/update-store';
import { canReloadNow } from '../utils/reload-decision';

/**
 * Applies an update that must not wait for a cold start, at the first moment it would cost
 * nothing: no call, no sign-in under way, and nothing the page reports it would lose.
 */
export function ReloadGuard() {
  const reloadWanted = useUpdateStore((state) => state.reloadWanted);
  const page = useUpdateStore((state) => state.page);
  const pageBusy = useUpdateStore((state) => state.busySources.length > 0);
  const inCall = useNativeCallStore((state) => state.call !== null);
  const authInProgress = useAuthStore(
    (state) => state.status === 'signing-in' || state.status === 'signing-out',
  );
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const reloading = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setAppActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!reloadWanted || reloading.current) return;
    if (!canReloadNow({ appActive, inCall, authInProgress, page, pageBusy })) return;

    reloading.current = true;
    Updates.reloadAsync().catch((error: unknown) => {
      reloading.current = false;
      console.warn('[updates] reload failed', error);
    });
  }, [reloadWanted, appActive, inCall, authInProgress, page, pageBusy]);

  return null;
}
