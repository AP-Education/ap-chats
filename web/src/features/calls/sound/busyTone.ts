import { getSharedAudioContext } from '@/shared/audio/audio-context';

import { scheduleTelephoneTone } from './telephoneTone';

// The phone-line busy signal: 480 + 620 Hz, half a second on and off, three times.
const BUSY_FREQUENCIES = [480, 620];
const BEEP_SECONDS = 0.5;
const BEEPS = 3;

/** What a turned-down call sounds like to the caller on any phone. */
export function playBusyTone(): void {
  const context = getSharedAudioContext();
  if (!context) return;
  const master = context.createGain();
  master.connect(context.destination);

  const now = context.currentTime;
  for (let beep = 0; beep < BEEPS; beep++) {
    scheduleTelephoneTone(context, master, {
      frequencies: BUSY_FREQUENCIES,
      startTime: now + beep * 2 * BEEP_SECONDS,
      duration: BEEP_SECONDS,
    });
  }

  setTimeout(() => master.disconnect(), BEEPS * 2 * BEEP_SECONDS * 1000);
}
