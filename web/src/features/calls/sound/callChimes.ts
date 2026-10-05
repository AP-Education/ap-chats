import { getSharedAudioContext } from '@/shared/audio/audio-context';
import { scheduleBell } from '@/shared/audio/tone';

interface MotifOptions {
  gain?: number;
  decay?: number;
}

function playMotif(frequencies: number[], { gain = 0.3, decay = 0.35 }: MotifOptions = {}): void {
  const context = getSharedAudioContext();
  if (!context) return;
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

  // Disconnects this chime's own nodes; the shared context itself stays alive for the session.
  const disconnectAfterMs = (frequencies.length * spacing + 0.6) * 1000;
  setTimeout(() => master.disconnect(), disconnectAfterMs);
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
