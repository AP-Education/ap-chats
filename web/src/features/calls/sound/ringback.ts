import { scheduleTelephoneTone } from './telephoneTone';

// The phone-line ringback Telegram plays too: 440 + 480 Hz, two seconds on, four off.
const RINGBACK_FREQUENCIES = [440, 480];
const RINGBACK_TONE_SECONDS = 2;
const RINGBACK_CYCLE_SECONDS = 6;

export interface Ringback {
  start: () => void;
  stop: () => void;
}

/** Plays for the caller while a call they started is still ringing, until
 * someone answers (or the call ends). */
export function createRingback(context: AudioContext): Ringback {
  const master = context.createGain();
  master.connect(context.destination);

  let ringTimer: ReturnType<typeof setInterval> | undefined;

  function ring() {
    scheduleTelephoneTone(context, master, {
      frequencies: RINGBACK_FREQUENCIES,
      startTime: context.currentTime,
      duration: RINGBACK_TONE_SECONDS,
    });
  }

  return {
    start() {
      ring();
      ringTimer = setInterval(ring, RINGBACK_CYCLE_SECONDS * 1000);
    },
    stop() {
      clearInterval(ringTimer);
      const at = context.currentTime;
      master.gain.setValueAtTime(master.gain.value, at);
      master.gain.linearRampToValueAtTime(0, at + 0.05);
      // Disconnects this ringback's own nodes; the shared context itself stays alive for the session.
      setTimeout(() => master.disconnect(), 100);
    },
  };
}
