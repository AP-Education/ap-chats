export interface BellOptions {
  frequency: number;
  startTime: number;
  /** Peak amplitude of the fundamental partial. */
  gain?: number;
  /** Seconds to reach peak. */
  attack?: number;
  /** Seconds from peak back to silence, for the fundamental — the upper
   * partials decay faster than this, see PARTIALS. */
  decay?: number;
  /** Stereo position, -1 (left) to 1 (right). */
  pan?: number;
}

interface Partial {
  /** Multiple of the fundamental frequency — slightly detuned from an
   * integer ratio, which is what makes this read as a struck bell instead
   * of a flat organ tone. */
  ratio: number;
  gain: number;
  decayScale: number;
}

// Higher partials ring out faster than the fundamental in a real bell: the
// "sparkle" on top settles quickly, leaving the fundamental to sustain.
const PARTIALS: Partial[] = [
  { ratio: 1, gain: 1, decayScale: 1 },
  { ratio: 2.01, gain: 0.45, decayScale: 0.55 },
  { ratio: 3.98, gain: 0.2, decayScale: 0.3 },
];

/**
 * A bright, struck-bell tone with three shimmering partials and an optional
 * stereo position. The one timbre shared by every call sound (ring, join,
 * leave) so they all read as the same voice, just different melodies.
 */
export function scheduleBell(
  context: BaseAudioContext,
  destinations: AudioNode | AudioNode[],
  { frequency, startTime, gain = 0.22, attack = 0.006, decay = 1.1, pan = 0 }: BellOptions,
): void {
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  for (const destination of Array.isArray(destinations) ? destinations : [destinations]) {
    panner.connect(destination);
  }

  for (const partial of PARTIALS) {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency * partial.ratio;

    const partialDecay = decay * partial.decayScale;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(gain * partial.gain, startTime + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + partialDecay);

    osc.connect(envelope);
    envelope.connect(panner);

    const stopAt = startTime + attack + partialDecay + 0.05;
    osc.start(startTime);
    osc.stop(stopAt);
  }
}
