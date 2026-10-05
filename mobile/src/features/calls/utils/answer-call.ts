import type { CallAnsweredEvent } from 'expo-callkit-telecom';

import { joinCall } from '../api/calls-api';
import { useNativeCallStore } from '../store/native-call-store';
import { playJoinChime } from './call-chimes';
import type { loadCallKitModule } from './callkit-module';
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
  try {
    if (!getTrackedSession(event.id)) await hydrateCallSession(CallKit);
    const session = getTrackedSession(event.id);
    if (!session) throw new Error('Incoming call session is unavailable');
    useNativeCallStore.getState().setCall({
      sessionId: event.id,
      caller: session.caller,
      status: 'connecting',
      isMuted: false,
    });
    const { workspaceId, channelId } = session.metadata;
    const grant = await joinCall(
      await requireAccessToken(),
      workspaceId,
      channelId,
      session.serverCallId,
    );
    session.room = await connectRoom(grant.url, grant.token);
    session.stopTrackingRemote = trackRemoteParticipant(session.room, (update) =>
      useNativeCallStore.getState().updateCall(update),
    );

    await waitForAudioSessionActive(CallKit);
    await session.room.localParticipant.setMicrophoneEnabled(true);

    await CallKit.fulfillIncomingCallConnected(event.requestId);
    useNativeCallStore.getState().setCall({
      sessionId: event.id,
      caller: session.caller,
      status: 'connected',
      isMuted: false,
      connectedAt: Date.now(),
    });
    playJoinChime();
  } catch (error) {
    if (__DEV__) console.warn('[calls] answer failed', error);
    await CallKit.failIncomingCallConnected(event.id, event.requestId).catch(() => undefined);
    await CallKit.endCall(event.id).catch(() => undefined);
  }
}
