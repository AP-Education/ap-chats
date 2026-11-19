import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useUpdateStore } from '../store/update-store';
import { isCheckDue, needsPromptReload } from '../utils/update-check';

/**
 * Downloads an over-the-air update at launch and on returns to the app. A downloaded update runs
 * from the next cold start; one that must not wait asks `ReloadGuard` to apply it sooner.
 */
export function UpdateRuntime() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let lastCheckedAt: number | null = null;
    let checking = false;
    const check = async () => {
      if (checking || !isCheckDue(lastCheckedAt, Date.now())) return;
      checking = true;
      lastCheckedAt = Date.now();
      try {
        const available = await Updates.checkForUpdateAsync();
        if (!available.isAvailable && !available.isRollBackToEmbedded) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (needsPromptReload(fetched)) useUpdateStore.getState().wantReload();
      } catch (error) {
        // No network or a refused signature: the running bundle stays, and the next check retries.
        console.warn('[updates] check failed', error);
      } finally {
        checking = false;
      }
    };

    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => subscription.remove();
  }, []);

  return null;
}
