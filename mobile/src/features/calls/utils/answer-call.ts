import type { CallAnsweredEvent } from 'expo-callkit-telecom';

import { joinCall } from '../api/calls-api';
import { useNativeCallStore } from '../store/native-call-store';
import type { loadCallKitModule } from './callkit-module';
import { connectRoom, waitForAudioSessionActive } from './livekit-room';
import { requireAccessToken } from './require-access-token';
import { getTrackedSession } from './session-registry';

/** The user answered from the system UI — join the same LiveKit room the web
 * app's useJoinCall would, then tell CallKit/Telecom media is ready. Takes the
 * already-loaded module rather than importing it statically — see callkit-module.ts. */
export async function answerCall(
  event: CallAnsweredEvent,
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
): Promise<void> {
  const session = getTrackedSession(event.id);
  if (!session) return;

  useNativeCallStore
    .getState()
    .setCall({ sessionId: event.id, caller: session.caller, status: 'connecting', isMuted: false });

  try {
    const { workspaceId, channelId } = session.metadata;
    const grant = await joinCall(
      requireAccessToken(),
      workspaceId,
      channelId,
      session.serverCallId,
    );
    session.room = await connectRoom(grant.url, grant.token);

    await waitForAudioSessionActive(CallKit);
    await session.room.localParticipant.setMicrophoneEnabled(true);

    await CallKit.fulfillIncomingCallConnected(event.requestId);
    useNativeCallStore
      .getState()
      .setCall({
        sessionId: event.id,
        caller: session.caller,
        status: 'connected',
        isMuted: false,
      });
  } catch (error) {
    if (__DEV__) console.warn('[calls] answer failed', error);
    await CallKit.failIncomingCallConnected(event.id, event.requestId).catch(() => undefined);
    await CallKit.endCall(event.id).catch(() => undefined);
  }
}
