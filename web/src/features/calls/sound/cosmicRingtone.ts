import { scheduleBell } from '@/shared/audio/tone';

// Two alternating phrases, not one loop repeated verbatim — a call that
// keeps ringing shouldn't sound like it's stuck on the same note. Both are
// spread across the stereo field and left to ring long enough to overlap
// into a chord, then answered by a resolving dyad, for width and movement
// instead of a single dry, monotone pluck.
const RISE = [523.25, 659.25, 783.99, 987.77]; // C5 E5 G5 B5
const FALL = [987.77, 783.99, 659.25, 523.25]; // B5 G5 E5 C5
const PAN_SPREAD = [-0.55, -0.18, 0.18, 0.55];
const NOTE_SPACING_SECONDS = 0.1;
const NOTE_DECAY_SECONDS = 1.15;
const CHORD_DELAY_SECONDS = 0.48;
// Tight enough that the chord's own ring fills most of the gap before the
// next phrase — a long silent tail between phrases is what reads as an
// unpleasant pause, not the phrase itself.
const CYCLE_SECONDS = 2.4;
const BREATHE_HZ = 0.18;

export interface Ringtone {
  start: () => void;
  stop: () => void;
}

/**
 * A generated ringtone, not a licensed sound file: a bright four-note
 * arpeggio, panned across the stereo field, resolving into a struck dyad —
 * alternating between a rising and a falling phrase so a long ring doesn't
 * loop identically. A faint, completely static low pad sits underneath for
 * warmth; no filter sweeps or drones, which beat against themselves and
 * read as an unpleasant hum rather than a call. Synthesized with the Web
 * Audio API so there's no asset to source, license, or ship.
 */
export function createCosmicRingtone(context: AudioContext): Ringtone {
  const now = context.currentTime;

  const master = context.createGain();
  master.gain.setValueAtTime(0, now);
  master.connect(context.destination);

  // A short slapback echo gives the chime a spacious, "cosmic" quality
  // without muddying the notes together.
  const delay = context.createDelay(1);
  delay.delayTime.value = 0.22;
  const feedback = context.createGain();
  feedback.gain.value = 0.22;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);

  const pad = context.createOscillator();
  pad.type = 'sine';
  pad.frequency.value = 130.81; // C3, two octaves under the chime
  const padGain = context.createGain();
  padGain.gain.value = 0.035;

  // A faint, slow swell rather than a dead-flat hum: it keeps the pad
  // audibly alive between phrases without turning into a filter-sweep wobble.
  const breathe = context.createOscillator();
  breathe.frequency.value = BREATHE_HZ;
  const breatheDepth = context.createGain();
  breatheDepth.gain.value = 0.015;
  breathe.connect(breatheDepth);
  breatheDepth.connect(padGain.gain);

  pad.connect(padGain);
  padGain.connect(master);

  let ringTimer: ReturnType<typeof setInterval> | undefined;
  let cycle = 0;

  function playPhrase() {
    const at = context.currentTime;
    const notes = cycle % 2 === 0 ? RISE : FALL;
    cycle += 1;

    notes.forEach((frequency, index) => {
      scheduleBell(context, [master, delay], {
        frequency,
        startTime: at + index * NOTE_SPACING_SECONDS,
        pan: PAN_SPREAD[index],
        decay: NOTE_DECAY_SECONDS,
      });
    });

    // The run's outer two notes struck together, centered: the chime it
    // was climbing (or falling) toward, landing after the arpeggio.
    const chordAt = at + CHORD_DELAY_SECONDS;
    [notes[0], notes[2]].forEach((frequency) => {
      scheduleBell(context, [master, delay], {
        frequency,
        startTime: chordAt,
        gain: 0.26,
        decay: NOTE_DECAY_SECONDS + 0.3,
      });
    });
  }

  return {
    start() {
      pad.start();
      breathe.start();
      master.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.4);
      playPhrase();
      ringTimer = setInterval(playPhrase, CYCLE_SECONDS * 1000);
    },
    stop() {
      clearInterval(ringTimer);
      const at = context.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setValueAtTime(master.gain.value, at);
      master.gain.linearRampToValueAtTime(0, at + 0.2);
      setTimeout(() => {
        pad.stop();
        breathe.stop();
        void context.close();
      }, 260);
    },
  };
}
