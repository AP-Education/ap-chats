import joinSound from '../../../../assets/sounds/join.wav';
import leaveSound from '../../../../assets/sounds/leave.wav';
import muteSound from '../../../../assets/sounds/mute.wav';
import unmuteSound from '../../../../assets/sounds/unmute.wav';
import { playCallSound } from '../background/call-sounds';

// Static WAV re-synthesis of web/'s sound/callChimes.ts, see
// scripts/generate-call-chimes.mjs — the same bell voice, offline since
// there's no Web Audio API to run here.
const sources = {
  join: joinSound,
  leave: leaveSound,
  mute: muteSound,
  unmute: unmuteSound,
} as const;

function play(key: keyof typeof sources): void {
  playCallSound(sources[key]);
}

export const playJoinChime = (): void => play('join');
export const playLeaveChime = (): void => play('leave');
export const playMuteChime = (): void => play('mute');
export const playUnmuteChime = (): void => play('unmute');
