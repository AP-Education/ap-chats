// A hard-gated sine clicks at both edges.
const EDGE_SECONDS = 0.015;

export interface TelephoneToneOptions {
  frequencies: number[];
  startTime: number;
  duration: number;
  /** Peak amplitude of each frequency. */
  gain?: number;
}

/** A steady burst of a phone line's call-progress signal, deliberately plain next to the app's bell chimes. */
export function scheduleTelephoneTone(
  context: BaseAudioContext,
  destination: AudioNode,
  { frequencies, startTime, duration, gain = 0.12 }: TelephoneToneOptions,
): void {
  const stopTime = startTime + duration;

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, startTime);
  envelope.gain.linearRampToValueAtTime(gain, startTime + EDGE_SECONDS);
  envelope.gain.setValueAtTime(gain, stopTime - EDGE_SECONDS);
  envelope.gain.linearRampToValueAtTime(0, stopTime);
  envelope.connect(destination);

  for (const frequency of frequencies) {
    const osc = context.createOscillator();
    osc.frequency.value = frequency;
    osc.connect(envelope);
    osc.start(startTime);
    osc.stop(stopTime);
  }
}
