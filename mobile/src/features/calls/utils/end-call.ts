import type { CallEndedEvent, CallEndedReason } from 'expo-callkit-telecom';

import { declineCall, leaveCall } from '../api/calls-api';
import { useNativeCallStore } from '../store/native-call-store';
import { playLeaveChime } from './call-chimes';
import { playBusyTone } from './call-tones';
import { untrackSession } from './session-registry';

/** Cancels pending connections and releases media. User hangups notify the
 * backend; system reports of remote endings only clean up the local session. */
export async function endCallSession(
  event: Pick<CallEndedEvent, 'id'>,
  { notifyServer = true, reason }: { notifyServer?: boolean; reason?: CallEndedReason } = {},
): Promise<void> {
  const current = useNativeCallStore.getState().call;
  const wasRinging = current?.sessionId === event.id && current.status === 'ringing';
  const session = untrackSession(event.id);
  useNativeCallStore.getState().clearCall(event.id);
  if (!session) return;

  try {
    session.stopTrackingRemote?.();
    session.stopCallCues?.();
    session.placed?.stop();
    if (session.room) {
      await session.room.disconnect();
      // A turned-down call sounds like a busy line, as on any phone.
      if (reason === 'declinedElsewhere') playBusyTone();
      else playLeaveChime();
    }
  } catch (error) {
    if (__DEV__) console.warn('[calls] media cleanup failed', error);
  }

  if (!notifyServer) return;
  const { workspaceId, channelId } = session.metadata;
  try {
    if (!wasRinging) {
      await leaveCall(workspaceId, channelId, session.serverCallId);
    } else {
      // A hangup before the answer action is a decline.
      await declineCall(workspaceId, channelId, session.serverCallId);
    }
  } catch (error) {
    if (__DEV__) console.warn('[calls] end failed', error);
  }
}
