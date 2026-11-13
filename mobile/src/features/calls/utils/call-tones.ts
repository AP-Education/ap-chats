import busySound from '../../../../assets/sounds/busy.wav';
import { playCallSound } from '../background/call-sounds';

// A static WAV render of web/'s sound/busyTone.ts, see scripts/generate-call-tones.mjs. The
// ringback is CallKit/Telecom's own dialtone (app.json), which follows the call's state natively.

export function playBusyTone(): void {
  playCallSound(busySound);
}
