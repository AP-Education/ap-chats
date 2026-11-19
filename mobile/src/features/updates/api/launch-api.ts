import { Platform } from 'react-native';

import { fetchWithTimeout } from '../../../shared/api/fetch-with-timeout';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export interface LaunchReport {
  runtimeVersion: string;
  /** Null while the bundle embedded in the binary runs. */
  updateId: string | null;
  isEmergencyLaunch: boolean;
  ok: boolean;
}

/** One try: a lost report only blurs the rollout numbers a little, so it is not retried. */
export async function reportLaunch(launch: LaunchReport): Promise<void> {
  if (!apiUrl || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  try {
    await fetchWithTimeout(
      `${apiUrl}/api/updates/launches`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: Platform.OS, ...launch }),
      },
      5000,
    );
  } catch {
    // Offline or the API is down: nothing to do.
  }
}
