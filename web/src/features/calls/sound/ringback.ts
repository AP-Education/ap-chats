import { scheduleBell } from '@/shared/audio/tone';

// The old version struck a chord and then went almost silent for over two
// seconds before the next one — that dead air was the actual problem, not
// the tone. This keeps a soft, continuously breathing bed underneath so
// there's never true silence, with a shorter, tighter pulse cadence riding
// on top instead of a sparse, isolated pluck.
const DYAD = [523.25, 783.99]; // C5 + G5
const PULSE_DECAY_SECONDS = 0.5;
const PULSE_CYCLE_SECONDS = 1.7;
const BED_FREQUENCY = 261.63; // C4, an octave under the dyad's root
const BREATHE_HZ = 0.22;

export interface Ringback {
  start: () => void;
  stop: () => void;
}

/** Plays for the caller while a call they started is still ringing, until
 * someone answers (or the call ends) — the ringback, mirroring the
 * ringtone the other side hears. */
export function createRingback(context: AudioContext): Ringback {
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0, now);
  master.connect(context.destination);

  // A quiet, slowly breathing pad: never silent, so the gap between pulses
  // reads as calm rather than dead air.
  const bed = context.createOscillator();
  bed.type = 'sine';
  bed.frequency.value = BED_FREQUENCY;
  const bedGain = context.createGain();
  bedGain.gain.value = 0.045;

  const breathe = context.createOscillator();
  breathe.frequency.value = BREATHE_HZ;
  const breatheDepth = context.createGain();
  breatheDepth.gain.value = 0.02;
  breathe.connect(breatheDepth);
  breatheDepth.connect(bedGain.gain);

  bed.connect(bedGain);
  bedGain.connect(master);

  let pulseTimer: ReturnType<typeof setInterval> | undefined;

  function pulse() {
    const at = context.currentTime;
    for (const frequency of DYAD) {
      scheduleBell(context, master, {
        frequency,
        startTime: at,
        gain: 0.18,
        decay: PULSE_DECAY_SECONDS,
      });
    }
  }

  return {
    start() {
      bed.start();
      breathe.start();
      master.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.3);
      pulse();
      pulseTimer = setInterval(pulse, PULSE_CYCLE_SECONDS * 1000);
    },
    stop() {
      clearInterval(pulseTimer);
      const at = context.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setValueAtTime(master.gain.value, at);
      master.gain.linearRampToValueAtTime(0, at + 0.2);
      setTimeout(() => {
        bed.stop();
        breathe.stop();
        void context.close();
      }, 260);
    },
  };
}
