import { createAudioPlayer } from 'expo-audio';

import busySound from '../../../../assets/sounds/busy.wav';
import ringbackSound from '../../../../assets/sounds/ringback.wav';

// Static WAV renders of web/'s sound/ringback.ts and sound/busyTone.ts, see
// scripts/generate-call-tones.mjs.

/** Rings until the returned stop is called: the WAV holds one whole on/off cycle. */
export function startRingback(): () => void {
  // Stopping must not deactivate the call's audio session.
  const player = createAudioPlayer(ringbackSound, { keepAudioSessionActive: true });
  player.loop = true;
  player.play();
  return () => player.remove();
}

export function playBusyTone(): void {
  const player = createAudioPlayer(busySound, { keepAudioSessionActive: true });
  player.play();
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) player.remove();
  });
}
