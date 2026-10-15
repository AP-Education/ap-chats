import { authRestored, useAuthStore } from '../../auth';
import { releaseCurrentDevice } from '../../push/api/release-current-device';
import type { CallKitApi } from './callkit-module';

/** A phone signed out of the app can't answer: the ring ends, and the phone leaves the calls. */
export async function dropRingWithoutSession(CallKit: CallKitApi): Promise<void> {
  await authRestored;
  const signedOut = useAuthStore.getState().status === 'signed-out';
  if (!signedOut) return;

  const ring = await CallKit.getActiveCallSession();
  if (ring?.status !== 'ringing') return;

  await CallKit.reportCallEnded(ring.id, 'failed');
  await releaseCurrentDevice();
}
