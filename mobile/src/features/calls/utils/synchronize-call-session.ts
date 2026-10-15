import type { CallEndedReason } from 'expo-callkit-telecom';

import { activeCall, CallsApiError } from '../api/calls-api';
import { useNativeCallStore } from '../store/native-call-store';
import { callOutcome } from './call-outcome';
import type { loadCallKitModule } from './callkit-module';
import { getTrackedSession } from './session-registry';

export async function synchronizeCallSession(
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
): Promise<void> {
  const current = useNativeCallStore.getState().call;
  if (!current) return;
  const session = getTrackedSession(current.sessionId);
  if (!session) return;
  // A call this device placed may have been answered while the socket was away, not only ended.
  if (session.placed) return session.placed.resync();
  let outcome: CallEndedReason | null;
  try {
    const live = await activeCall(session.metadata.workspaceId, session.metadata.channelId);
    outcome = callOutcome(current.status, session.serverCallId, live);
  } catch (error) {
    const gone = error instanceof CallsApiError && [403, 404].includes(error.status);
    outcome = gone ? 'remoteEnded' : null;
  }
  const latest = useNativeCallStore.getState().call;
  if (outcome && latest?.sessionId === current.sessionId && latest.status === current.status)
    await CallKit.reportCallEnded(current.sessionId, outcome);
}
