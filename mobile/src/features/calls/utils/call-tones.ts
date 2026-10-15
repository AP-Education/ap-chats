import { createAudioPlayer } from 'expo-audio';

import busySound from '../../../../assets/sounds/busy.wav';

// A static WAV render of web/'s sound/busyTone.ts, see scripts/generate-call-tones.mjs. The
// ringback is CallKit/Telecom's own dialtone (app.json), which follows the call's state natively.

export function playBusyTone(): void {
  const player = createAudioPlayer(busySound, { keepAudioSessionActive: true });
  player.play();
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) player.remove();
  });
}
