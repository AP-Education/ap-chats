import type { CallParticipant } from 'expo-callkit-telecom';

import { leaveCall } from '../api/calls-api';
import { useNativeCallStore } from '../store/native-call-store';
import type { NativeCallConnectPayload } from '../types';
import { playJoinChime } from './call-chimes';
import { loadCallKitModule } from './callkit-module';
import { endCallSession } from './end-call';
import { restoreIncomingSession } from './hydrate-call-session';
import { connectRoom, waitForAudioSessionActive } from './livekit-room';
import { requireAccessToken } from './require-access-token';
import { findTrackedSessionIdByServerCallId, trackSession } from './session-registry';
import { trackRemoteParticipant } from './track-remote-participant';

const pendingConnections = new Set<string>();

/** The WebView requests a call, while native owns its room and microphone.
 * Joining an incoming call reuses its CallKit session; other calls start an
 * outgoing session for system audio routing and call controls. */
export async function connectBridgedCall(payload: NativeCallConnectPayload): Promise<void> {
  const callId = payload.grant.callId;
  if (pendingConnections.has(callId)) return;
  pendingConnections.add(callId);
  try {
    const CallKit = await loadCallKitModule();
    if (!CallKit) return;

    const incoming = await CallKit.getActiveCallSession();
    if (incoming?.incomingCallEvent?.serverCallId === payload.grant.callId) {
      restoreIncomingSession(incoming);
      if (incoming.status === 'ringing') await CallKit.answerCall(incoming.id);
      return;
    }
    if (findTrackedSessionIdByServerCallId(payload.grant.callId)) return;

    const caller: CallParticipant = {
      id: payload.channelId,
      displayName: payload.title,
      avatarUrl: payload.calleeAvatarPath ?? undefined,
    };

    let sessionId: string;
    try {
      sessionId = await CallKit.startOutgoingCall(caller, { hasVideo: false });
    } catch (error) {
      if (__DEV__) console.warn('[calls] outgoing start failed', error);
      try {
        await leaveCall(
          await requireAccessToken(),
          payload.workspaceId,
          payload.channelId,
          payload.grant.callId,
        );
      } catch (cleanupError) {
        if (__DEV__) console.warn('[calls] outgoing cleanup failed', cleanupError);
      }
      return;
    }

    const session = trackSession(sessionId, {
      serverCallId: payload.grant.callId,
      metadata: { workspaceId: payload.workspaceId, channelId: payload.channelId },
      caller,
    });
    useNativeCallStore
      .getState()
      .setCall({ sessionId, caller, status: 'connecting', isMuted: false });

    const signal = session.abortController.signal;
    try {
      await waitForOutgoingCallStarted(sessionId, CallKit, signal);
      const room = await connectRoom(payload.grant.url, payload.grant.token, signal);
      if (signal.aborted) {
        await room.disconnect();
        return;
      }
      session.room = room;
      session.stopTrackingRemote = trackRemoteParticipant(session.room, (update) =>
        useNativeCallStore.getState().updateCall(update),
      );
      await waitForAudioSessionActive(CallKit, signal);
      await room.localParticipant.setMicrophoneEnabled(
        !useNativeCallStore.getState().call?.isMuted,
      );
      if (signal.aborted) return;
      await CallKit.reportOutgoingCallConnected(sessionId);
      if (signal.aborted) return;
      useNativeCallStore.getState().updateCall({ status: 'connected', connectedAt: Date.now() });
      playJoinChime();
    } catch (error) {
      if (signal.aborted) return;
      if (__DEV__) console.warn('[calls] outgoing connect failed', error);
      const cleanup = endCallSession({ id: sessionId });
      await CallKit.endCall(sessionId).catch(() => undefined);
      await cleanup;
    }
  } finally {
    pendingConnections.delete(callId);
  }
}

async function waitForOutgoingCallStarted(
  sessionId: string,
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
  signal: AbortSignal,
): Promise<void> {
  let finish!: () => void;
  let fail!: (error: Error) => void;
  const started = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  const cancel = () => fail(new Error('Outgoing call ended before starting'));
  const timeout = setTimeout(() => fail(new Error('CallKit outgoing start timed out')), 10000);
  const subscription = CallKit.addOutgoingCallStartedListener((event) => {
    if (event.id === sessionId) finish();
  });
  signal.addEventListener('abort', cancel, { once: true });
  // CallKit may emit the start event before startOutgoingCall() returns its ID.
  const snapshot = CallKit.getActiveCallSession().then((active) => {
    if (!active || active.id !== sessionId || active.status === 'ended') cancel();
    else if (active.status === 'connecting' || active.status === 'connected') finish();
  });
  if (signal.aborted) cancel();
  try {
    await Promise.all([started, snapshot]);
  } finally {
    clearTimeout(timeout);
    subscription.remove();
    signal.removeEventListener('abort', cancel);
  }
}
