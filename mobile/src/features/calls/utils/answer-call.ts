import type { CallAnsweredEvent } from 'expo-callkit-telecom';

import { NotSignedInError } from '../../auth';
import { joinCall } from '../api/calls-api';
import { useAnswerFailureStore } from '../store/answer-failure-store';
import { useNativeCallStore } from '../store/native-call-store';
import { syncCurrentAudioRoute } from './audio-route';
import { trackCallCues } from './call-cues';
import type { CallKitApi } from './callkit-module';
import { endCallSession } from './end-call';
import { hydrateCallSession } from './hydrate-call-session';
import { connectRoom, waitForAudioSessionActive } from './livekit-room';
import { getTrackedSession } from './session-registry';
import { trackRemoteParticipant } from './track-remote-participant';

/** The user answered from the system UI — join the same LiveKit room the web
 * app's useJoinCall would, then tell CallKit/Telecom media is ready. Takes the
 * already-loaded module rather than importing it statically — see callkit-module.ts. */
export async function answerCall(event: CallAnsweredEvent, CallKit: CallKitApi): Promise<void> {
  let session = getTrackedSession(event.id);
  try {
    if (!session) {
      await hydrateCallSession(CallKit);
      session = getTrackedSession(event.id);
    }
    if (!session) throw new Error('Incoming call session is unavailable');
    if (session.answerRequestId) return;
    session.answerRequestId = event.requestId;
    useAnswerFailureStore.getState().clear();
    const signal = session.abortController.signal;
    const current = useNativeCallStore.getState().call;
    const mutedBeforeAnswer = current?.sessionId === event.id && current.isMuted;
    useNativeCallStore.getState().setCall({
      sessionId: event.id,
      caller: session.caller,
      status: 'connecting',
      isMuted: mutedBeforeAnswer,
    });
    const { workspaceId, channelId } = session.metadata;
    const grant = await joinCall(workspaceId, channelId, session.serverCallId, signal);
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
    syncCurrentAudioRoute(CallKit);
    await room.localParticipant.setMicrophoneEnabled(!useNativeCallStore.getState().call?.isMuted);
    if (signal.aborted) return;
    useNativeCallStore.getState().updateCall({
      status: 'connected',
      answeredAt: grant.answeredAt ? Date.parse(grant.answeredAt) : Date.now(),
    });
    session.stopCallCues = trackCallCues(room, session.group);
  } catch (error) {
    if (session?.abortController.signal.aborted) return;
    if (__DEV__) console.warn('[calls] answer failed', error);
    useAnswerFailureStore
      .getState()
      .fail(error instanceof NotSignedInError ? 'signed-out' : 'unreachable');
    const cleanup = endCallSession(event);
    await CallKit.failIncomingCallConnected(event.id, event.requestId).catch(() => undefined);
    await CallKit.endCall(event.id).catch(() => undefined);
    await cleanup;
  }
}
