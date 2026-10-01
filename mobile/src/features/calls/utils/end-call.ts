import type { CallEndedEvent } from 'expo-callkit-telecom';

import { declineCall, leaveCall } from '../api/calls-api';
import { useNativeCallStore } from '../store/native-call-store';
import { requireAccessToken } from './require-access-token';
import { untrackSession } from './session-registry';

/** The system UI ended the call, or the user hung up from our own screen —
 * either way CallKit/Telecom has already torn down its side by the time this
 * fires; this only needs to tell the backend and free the LiveKit room. */
export async function endCallSession(event: CallEndedEvent): Promise<void> {
  const session = untrackSession(event.id);
  useNativeCallStore.getState().clearCall(event.id);
  if (!session) return;

  const { workspaceId, channelId } = session.metadata;
  try {
    if (session.room) {
      await session.room.disconnect();
      await leaveCall(requireAccessToken(), workspaceId, channelId, session.serverCallId);
    } else {
      // Never answered — a hangup from the system UI before connecting is a decline.
      await declineCall(requireAccessToken(), workspaceId, channelId, session.serverCallId);
    }
  } catch (error) {
    if (__DEV__) console.warn('[calls] end failed', error);
  }
}
