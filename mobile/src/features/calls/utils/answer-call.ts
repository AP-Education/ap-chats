import type { CallAnsweredEvent } from 'expo-callkit-telecom';

import { joinCall } from '../api/calls-api';
import { useNativeCallStore } from '../store/native-call-store';
import { playJoinChime } from './call-chimes';
import type { loadCallKitModule } from './callkit-module';
import { endCallSession } from './end-call';
import { hydrateCallSession } from './hydrate-call-session';
import { connectRoom, waitForAudioSessionActive } from './livekit-room';
import { requireAccessToken } from './require-access-token';
import { getTrackedSession } from './session-registry';
import { trackRemoteParticipant } from './track-remote-participant';

/** The user answered from the system UI — join the same LiveKit room the web
 * app's useJoinCall would, then tell CallKit/Telecom media is ready. Takes the
 * already-loaded module rather than importing it statically — see callkit-module.ts. */
export async function answerCall(
  event: CallAnsweredEvent,
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
): Promise<void> {
  let session = getTrackedSession(event.id);
  try {
    if (!session) {
      await hydrateCallSession(CallKit);
      session = getTrackedSession(event.id);
    }
    if (!session) throw new Error('Incoming call session is unavailable');
    if (session.answerRequestId) return;
    session.answerRequestId = event.requestId;
    const signal = session.abortController.signal;
    useNativeCallStore.getState().setCall({
      sessionId: event.id,
      caller: session.caller,
      status: 'connecting',
      isMuted: useNativeCallStore.getState().call?.isMuted ?? false,
    });
    const { workspaceId, channelId } = session.metadata;
    const accessToken = await requireAccessToken();
    if (signal.aborted) return;
    const grant = await joinCall(accessToken, workspaceId, channelId, session.serverCallId);
    if (signal.aborted) return;
    const room = await connectRoom(grant.url, grant.token, signal);
    if (signal.aborted) {
      await room.disconnect();
      return;
    }
    session.room = room;
    session.stopTrackingRemote = trackRemoteParticipant(session.room, (update) =>
      useNativeCallStore.getState().updateCall(update),
    );

    // Completing the answer action lets CallKit activate audio; waiting first deadlocks.
    await CallKit.fulfillIncomingCallConnected(event.requestId);
    await waitForAudioSessionActive(CallKit, signal);
    await room.localParticipant.setMicrophoneEnabled(!useNativeCallStore.getState().call?.isMuted);
    if (signal.aborted) return;
    useNativeCallStore.getState().updateCall({
      status: 'connected',
      connectedAt: Date.now(),
    });
    playJoinChime();
  } catch (error) {
    if (session?.abortController.signal.aborted) return;
    if (__DEV__) console.warn('[calls] answer failed', error);
    const cleanup = endCallSession(event);
    await CallKit.failIncomingCallConnected(event.id, event.requestId).catch(() => undefined);
    await CallKit.endCall(event.id).catch(() => undefined);
    await cleanup;
  }
}
