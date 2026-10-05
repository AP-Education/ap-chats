import type { CallSession } from 'expo-callkit-telecom';

import { useNativeCallStore } from '../store/native-call-store';
import { extractCallMetadata } from './call-metadata';
import type { loadCallKitModule } from './callkit-module';
import { getTrackedSession, trackSession } from './session-registry';

export function restoreIncomingSession(session: CallSession): void {
  if (getTrackedSession(session.id)) return;
  const metadata = extractCallMetadata({ session });
  const incoming = session.incomingCallEvent;
  if (!metadata || !incoming) return;
  trackSession(session.id, {
    serverCallId: incoming.serverCallId,
    metadata,
    caller: incoming.caller,
  });
  useNativeCallStore.getState().setCall({
    sessionId: session.id,
    caller: incoming.caller,
    status: 'ringing',
    isMuted: session.isMuted,
  });
}

export async function hydrateCallSession(
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
): Promise<void> {
  const session = await CallKit.getActiveCallSession();
  if (session) restoreIncomingSession(session);
}
