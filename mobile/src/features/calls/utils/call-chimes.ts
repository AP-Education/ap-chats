import { createAudioPlayer } from 'expo-audio';

import joinSound from '../../../../assets/sounds/join.wav';
import leaveSound from '../../../../assets/sounds/leave.wav';
import muteSound from '../../../../assets/sounds/mute.wav';
import unmuteSound from '../../../../assets/sounds/unmute.wav';

// Static WAV re-synthesis of web/'s sound/callChimes.ts, see
// scripts/generate-call-chimes.mjs — the same bell voice, offline since
// there's no Web Audio API to run here.
const sources = {
  join: joinSound,
  leave: leaveSound,
  mute: muteSound,
  unmute: unmuteSound,
} as const;

/** A fresh player per call: these are one-shot and gone well under a second
 * later, so there's no lifecycle to hold onto past that. */
function play(key: keyof typeof sources): void {
  // A finishing chime must not deactivate the call's audio session.
  const player = createAudioPlayer(sources[key], { keepAudioSessionActive: true });
  player.play();
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) player.remove();
  });
}

export const playJoinChime = (): void => play('join');
export const playLeaveChime = (): void => play('leave');
export const playMuteChime = (): void => play('mute');
export const playUnmuteChime = (): void => play('unmute');
