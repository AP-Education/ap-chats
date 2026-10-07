import type { SetMutedActionEvent } from 'expo-callkit-telecom';

import { useNativeCallStore } from '../store/native-call-store';
import { playMuteChime, playUnmuteChime } from './call-chimes';
import type { loadCallKitModule } from './callkit-module';
import { getTrackedSession } from './session-registry';

/** Fires both when the system's own mute button is pressed and when our
 * NativeInCallScreen calls setMuted itself — one path either way. Takes the
 * already-loaded module rather than importing it statically — see callkit-module.ts. */
export async function setCallMuted(
  event: SetMutedActionEvent,
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
): Promise<void> {
  const call = useNativeCallStore.getState().call;
  if (call?.sessionId !== event.id) return;

  // Recorded even while connecting: the connect paths read it before turning the mic on.
  useNativeCallStore.getState().updateCall({ isMuted: event.isMuted });

  try {
    // Before audio activation the mic stays untouched, or CallKit can deadlock the answer.
    const room = getTrackedSession(event.id)?.room;
    const micIsLive = room && CallKit.getAudioSession().isActive;
    if (micIsLive) await room.localParticipant.setMicrophoneEnabled(!event.isMuted);

    await CallKit.setMuted(event.id, event.isMuted);
    (event.isMuted ? playMuteChime : playUnmuteChime)();
  } catch (error) {
    if (__DEV__) console.warn('[calls] mute failed', error);
  }
}
