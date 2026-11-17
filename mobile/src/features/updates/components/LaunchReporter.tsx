import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { reportLaunch } from '../api/launch-api';
import { useUpdateStore } from '../store/update-store';
import { LAUNCH_SETTLE_MS, launchOutcome, PAGE_START_LIMIT_MS } from '../utils/launch-outcome';

/**
 * Tells the API once per cold start whether the running bundle launched and loaded the page, so
 * a rollout shows how each update does. A launch in the background, such as a ring waking the
 * app, never shows the page, so it is not counted.
 */
export function LaunchReporter() {
  useEffect(() => {
    const runtimeVersion = Updates.runtimeVersion;
    if (__DEV__ || !Updates.isEnabled || !runtimeVersion) return;
    if (AppState.currentState === 'background') return;

    const startedAt = Date.now();
    let reported = false;
    const settle = () => {
      if (reported) return;
      const { page, pageLoaded } = useUpdateStore.getState();
      const ok = launchOutcome({ elapsedMs: Date.now() - startedAt, page, pageLoaded });
      if (ok === null) return;
      reported = true;
      void reportLaunch({
        runtimeVersion,
        updateId: Updates.isEmbeddedLaunch ? null : Updates.updateId,
        isEmergencyLaunch: Updates.isEmergencyLaunch,
        ok,
      });
    };

    const timers = [setTimeout(settle, LAUNCH_SETTLE_MS), setTimeout(settle, PAGE_START_LIMIT_MS)];
    const unsubscribe = useUpdateStore.subscribe(settle);
    return () => {
      reported = true;
      timers.forEach(clearTimeout);
      unsubscribe();
    };
  }, []);

  return null;
}
