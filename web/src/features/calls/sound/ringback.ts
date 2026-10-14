import { getSharedAudioContext } from '@/shared/audio/audio-context';

import { scheduleTelephoneTone } from './telephoneTone';

// The phone-line ringback Telegram plays too: 440 + 480 Hz, two seconds on, four off.
const RINGBACK_FREQUENCIES = [440, 480];
const RINGBACK_TONE_SECONDS = 2;
const RINGBACK_CYCLE_SECONDS = 6;
// Shorter than this, a tone is no more than a click.
const SHORTEST_TONE_SECONDS = 0.2;
const FADE_SECONDS = 0.05;

/**
 * Rings back for the given seconds, then falls silent on its own; the returned stop silences it
 * sooner. All of it is laid out on the audio clock at once: a timer can be throttled in a hidden
 * tab, stretching or bunching the rings, while scheduled sound plays and ends on time.
 */
export function playRingback(seconds: number): () => void {
  const context = getSharedAudioContext();
  if (!context) return () => undefined;
  const master = context.createGain();
  master.connect(context.destination);

  const startTime = context.currentTime;
  for (let offset = 0; offset < seconds; offset += RINGBACK_CYCLE_SECONDS) {
    const duration = Math.min(RINGBACK_TONE_SECONDS, seconds - offset);
    if (duration < SHORTEST_TONE_SECONDS) break;

    scheduleTelephoneTone(context, master, {
      frequencies: RINGBACK_FREQUENCIES,
      startTime: startTime + offset,
      duration,
    });
  }

  return () => {
    const at = context.currentTime;
    master.gain.setValueAtTime(master.gain.value, at);
    master.gain.linearRampToValueAtTime(0, at + FADE_SECONDS);
    // Disconnects this ringback's own nodes; the shared context itself stays alive for the session.
    setTimeout(() => master.disconnect(), FADE_SECONDS * 2000);
  };
}
