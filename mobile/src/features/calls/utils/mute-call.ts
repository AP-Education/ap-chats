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
  const session = getTrackedSession(event.id);
  if (!session?.room) return;
  try {
    await session.room.localParticipant.setMicrophoneEnabled(!event.isMuted);
    await CallKit.setMuted(event.id, event.isMuted);
    useNativeCallStore.getState().updateCall({ isMuted: event.isMuted });
    (event.isMuted ? playMuteChime : playUnmuteChime)();
  } catch (error) {
    if (__DEV__) console.warn('[calls] mute failed', error);
  }
}
