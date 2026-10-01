import type { CallParticipant } from 'expo-callkit-telecom';

import { useNativeCallStore } from '../store/native-call-store';
import type { NativeCallConnectPayload } from '../types';
import { loadCallKitModule } from './callkit-module';
import { connectRoom, waitForAudioSessionActive } from './livekit-room';
import { getTrackedSession, trackSession } from './session-registry';
import { trackRemoteParticipant } from './track-remote-participant';

/** The web UI started or joined a call (useStartCall/useJoinCall) while running
 * inside the mobile shell. Reports it to CallKit/Telecom as an outgoing call —
 * same Request/Report flow as an incoming one, just starting from this side —
 * so the OS gets a real call session (audio routing, lock screen, Recents) and
 * NativeInCallScreen's mute/end (which address CallKit by session id) work. */
export async function connectBridgedCall(payload: NativeCallConnectPayload): Promise<void> {
  const CallKit = await loadCallKitModule();
  if (!CallKit) return;

  const caller: CallParticipant = {
    id: payload.channelId,
    displayName: payload.title,
    avatarUrl: payload.calleeAvatarPath ?? undefined,
  };

  const sessionId = await CallKit.startOutgoingCall(caller, { hasVideo: false });

  trackSession(sessionId, {
    serverCallId: payload.grant.callId,
    metadata: { workspaceId: payload.workspaceId, channelId: payload.channelId },
    caller,
  });
  useNativeCallStore
    .getState()
    .setCall({ sessionId, caller, status: 'connecting', isMuted: false });

  // Waits for either: the OS accepted the call (time to connect media), or it
  // ended first (e.g. the user hung up before that happened) — in which case
  // endCallSession has already untracked it, and the block below just no-ops.
  await new Promise<void>((resolve) => {
    const startedSubscription = CallKit.addOutgoingCallStartedListener((event) => {
      if (event.id !== sessionId) return;
      startedSubscription.remove();
      endedSubscription.remove();
      resolve();
    });
    const endedSubscription = CallKit.addCallEndedListener((event) => {
      if (event.id !== sessionId) return;
      startedSubscription.remove();
      endedSubscription.remove();
      resolve();
    });
  });

  const session = getTrackedSession(sessionId);
  if (!session) return;

  try {
    session.room = await connectRoom(payload.grant.url, payload.grant.token);
    session.stopTrackingRemote = trackRemoteParticipant(session.room, (update) =>
      useNativeCallStore.getState().updateCall(update),
    );
    await waitForAudioSessionActive(CallKit);
    await session.room.localParticipant.setMicrophoneEnabled(true);
    await CallKit.reportOutgoingCallConnected(sessionId);
    useNativeCallStore
      .getState()
      .setCall({ sessionId, caller, status: 'connected', isMuted: false, connectedAt: Date.now() });
  } catch (error) {
    if (__DEV__) console.warn('[calls] outgoing connect failed', error);
    await CallKit.endCall(sessionId).catch(() => undefined);
  }
}
