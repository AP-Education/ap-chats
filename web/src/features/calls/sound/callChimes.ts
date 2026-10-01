import { scheduleBell } from './tone';

interface MotifOptions {
  gain?: number;
  decay?: number;
}

/** A brief, self-contained context per chime: these fire once and are gone
 * well under a second later, so there's no lifecycle to manage. */
function playMotif(frequencies: number[], { gain = 0.3, decay = 0.35 }: MotifOptions = {}): void {
  if (typeof AudioContext === 'undefined') return;
  const context = new AudioContext();
  const master = context.createGain();
  master.connect(context.destination);

  const now = context.currentTime;
  const spacing = 0.09;
  frequencies.forEach((frequency, index) => {
    scheduleBell(context, master, {
      frequency,
      startTime: now + index * spacing,
      gain,
      decay,
    });
  });

  const closeAfterMs = (frequencies.length * spacing + 0.6) * 1000;
  setTimeout(() => void context.close(), closeAfterMs);
}

/** A short rising two-note chime: you've joined the call. */
export function playJoinChime(): void {
  playMotif([523.25, 783.99]); // C5 -> G5
}

/** The mirror, falling: you've left the call. */
export function playLeaveChime(): void {
  playMotif([659.25, 440]); // E5 -> A4
}

/** A single soft, muffled note: you've muted your mic. Quieter and shorter
 * than join/leave since this can fire many times a call. */
export function playMuteChime(): void {
  playMotif([392.0], { gain: 0.22, decay: 0.3 }); // G4
}

/** The mirror, brighter: you've unmuted. */
export function playUnmuteChime(): void {
  playMotif([659.25], { gain: 0.24, decay: 0.25 }); // E5
}
