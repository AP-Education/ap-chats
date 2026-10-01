#!/usr/bin/env node
// Offline re-synthesis of web/src/features/calls/sound/callChimes.ts (same
// constants and envelope math as generate-ringtone.mjs's ringtone render) —
// join/leave/mute/unmute all fire from native code that can't run Web Audio,
// so this is how the same chime voice reaches CallSignalSocket/mute-call.ts.
// Re-run this after changing the web chimes' constants.
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/sounds');

const SPACING_SECONDS = 0.09;
const ATTACK_SECONDS = 0.006;

const PARTIALS = [
  { ratio: 1, gain: 1, decayScale: 1 },
  { ratio: 2.01, gain: 0.45, decayScale: 0.55 },
  { ratio: 3.98, gain: 0.2, decayScale: 0.3 },
];

// Mirrors scheduleBell() in web/src/shared/audio/tone.ts, rendered
// into fixed-size stereo buffers instead of scheduled on an AudioContext.
function scheduleBell(notesL, notesR, totalSamples, startTime, frequency, { gain, decay }) {
  // pan = 0 for every chime note, same as callChimes.ts never passing one —
  // equal-power center per StereoPannerNode's own law (cos/sin at x=0.5).
  const gainL = Math.cos(Math.PI / 4);
  const gainR = Math.sin(Math.PI / 4);

  for (const partial of PARTIALS) {
    const peak = gain * partial.gain;
    const partialDecay = decay * partial.decayScale;
    const stopTime = startTime + ATTACK_SECONDS + partialDecay + 0.05;
    const startSample = Math.max(0, Math.floor(startTime * SAMPLE_RATE));
    const stopSample = Math.min(totalSamples, Math.ceil(stopTime * SAMPLE_RATE));
    const angularFrequency = 2 * Math.PI * frequency * partial.ratio;

    for (let n = startSample; n < stopSample; n++) {
      const t = n / SAMPLE_RATE - startTime;
      let envelope;
      if (t <= ATTACK_SECONDS) {
        envelope = 0.0001 * Math.pow(peak / 0.0001, t / ATTACK_SECONDS);
      } else if (t <= ATTACK_SECONDS + partialDecay) {
        const frac = (t - ATTACK_SECONDS) / partialDecay;
        envelope = peak * Math.pow(0.0001 / peak, frac);
      } else {
        envelope = 0.0001;
      }
      const sample = envelope * Math.sin(angularFrequency * t);
      notesL[n] += sample * gainL;
      notesR[n] += sample * gainR;
    }
  }
}

// Mirrors playMotif() in web/src/features/calls/sound/callChimes.ts.
function renderMotif(frequencies, { gain, decay }) {
  const durationSeconds = frequencies.length * SPACING_SECONDS + 0.6;
  const totalSamples = Math.round(durationSeconds * SAMPLE_RATE);
  const notesL = new Float64Array(totalSamples);
  const notesR = new Float64Array(totalSamples);

  frequencies.forEach((frequency, index) => {
    scheduleBell(notesL, notesR, totalSamples, index * SPACING_SECONDS, frequency, { gain, decay });
  });

  const pcm = new Int16Array(totalSamples * 2);
  for (let n = 0; n < totalSamples; n++) {
    pcm[n * 2] = Math.round(Math.max(-1, Math.min(1, notesL[n])) * 32767);
    pcm[n * 2 + 1] = Math.round(Math.max(-1, Math.min(1, notesR[n])) * 32767);
  }
  return pcm;
}

function writeWav(fileName, pcm) {
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = pcm.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const outFile = resolve(OUT_DIR, fileName);
  writeFileSync(outFile, Buffer.concat([header, Buffer.from(pcm.buffer)]));
  // eslint-disable-next-line no-undef -- plain Node script, run directly via `node`, not bundled
  console.log(`Wrote ${outFile} (${((44 + dataSize) / 1024).toFixed(1)} KiB)`);
}

const CHIMES = {
  'join.wav': { frequencies: [523.25, 783.99], gain: 0.3, decay: 0.35 }, // C5 -> G5
  'leave.wav': { frequencies: [659.25, 440], gain: 0.3, decay: 0.35 }, // E5 -> A4
  'mute.wav': { frequencies: [392.0], gain: 0.22, decay: 0.3 }, // G4
  'unmute.wav': { frequencies: [659.25], gain: 0.24, decay: 0.25 }, // E5
};

for (const [fileName, { frequencies, gain, decay }] of Object.entries(CHIMES)) {
  writeWav(fileName, renderMotif(frequencies, { gain, decay }));
}
