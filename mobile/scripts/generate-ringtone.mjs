#!/usr/bin/env node
// Offline re-synthesis of web/src/features/calls/sound/cosmicRingtone.ts (same
// constants and envelope math) into a loopable WAV file — CallKit/Telecom can
// only play a bundled sound file, not run Web Audio, so this is how the same
// "cosmic" ring reaches the native incoming-call screen instead of the system
// default. Re-run this after changing the web ringtone's constants.
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const OUT_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/sounds/ringtone.wav');

const RISE = [523.25, 659.25, 783.99, 987.77];
const FALL = [987.77, 783.99, 659.25, 523.25];
const PAN_SPREAD = [-0.55, -0.18, 0.18, 0.55];
const NOTE_SPACING_SECONDS = 0.1;
const NOTE_DECAY_SECONDS = 1.15;
const CHORD_DELAY_SECONDS = 0.48;
const CYCLE_SECONDS = 2.4;
const BREATHE_HZ = 0.18;
const PAD_FREQUENCY = 130.81;
const PAD_GAIN = 0.035;
const BREATHE_DEPTH = 0.015;
const DELAY_TIME_SECONDS = 0.22;
const DELAY_FEEDBACK = 0.22;
const MASTER_GAIN = 0.5;

const PARTIALS = [
  { ratio: 1, gain: 1, decayScale: 1 },
  { ratio: 2.01, gain: 0.45, decayScale: 0.55 },
  { ratio: 3.98, gain: 0.2, decayScale: 0.3 },
];

// One RISE cycle + one FALL cycle, so a looping player alternates phrases the
// same way continuous ringing would, instead of repeating just one of them.
const DURATION_SECONDS = CYCLE_SECONDS * 2;
const TOTAL_SAMPLES = Math.round(DURATION_SECONDS * SAMPLE_RATE);

const notesL = new Float64Array(TOTAL_SAMPLES);
const notesR = new Float64Array(TOTAL_SAMPLES);

// Mirrors scheduleBell() in web/src/features/calls/sound/tone.ts.
function scheduleBell(startTime, frequency, { gain = 0.22, attack = 0.006, decay = 1.1, pan = 0 }) {
  const x = (pan + 1) / 2;
  const gainL = Math.cos((x * Math.PI) / 2);
  const gainR = Math.sin((x * Math.PI) / 2);

  for (const partial of PARTIALS) {
    const peak = gain * partial.gain;
    const partialDecay = decay * partial.decayScale;
    const stopTime = startTime + attack + partialDecay + 0.05;
    const startSample = Math.max(0, Math.floor(startTime * SAMPLE_RATE));
    const stopSample = Math.min(TOTAL_SAMPLES, Math.ceil(stopTime * SAMPLE_RATE));
    const angularFrequency = 2 * Math.PI * frequency * partial.ratio;

    for (let n = startSample; n < stopSample; n++) {
      const t = n / SAMPLE_RATE - startTime;
      let envelope;
      if (t <= attack) {
        envelope = 0.0001 * Math.pow(peak / 0.0001, t / attack);
      } else if (t <= attack + partialDecay) {
        const frac = (t - attack) / partialDecay;
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

function playPhrase(startAt, notes) {
  notes.forEach((frequency, index) => {
    scheduleBell(startAt + index * NOTE_SPACING_SECONDS, frequency, {
      pan: PAN_SPREAD[index],
      decay: NOTE_DECAY_SECONDS,
    });
  });

  const chordAt = startAt + CHORD_DELAY_SECONDS;
  [notes[0], notes[2]].forEach((frequency) => {
    scheduleBell(chordAt, frequency, { gain: 0.26, decay: NOTE_DECAY_SECONDS + 0.3 });
  });
}

playPhrase(0, RISE);
playPhrase(CYCLE_SECONDS, FALL);

// Slapback echo: a feedback delay of the (already panned) arpeggio/chord bus.
const delaySamples = Math.round(DELAY_TIME_SECONDS * SAMPLE_RATE);
const delayOutL = new Float64Array(TOTAL_SAMPLES);
const delayOutR = new Float64Array(TOTAL_SAMPLES);
for (let n = 0; n < TOTAL_SAMPLES; n++) {
  const inputL = n >= delaySamples ? notesL[n - delaySamples] : 0;
  const inputR = n >= delaySamples ? notesR[n - delaySamples] : 0;
  const feedbackL = n >= delaySamples ? delayOutL[n - delaySamples] : 0;
  const feedbackR = n >= delaySamples ? delayOutR[n - delaySamples] : 0;
  delayOutL[n] = inputL + DELAY_FEEDBACK * feedbackL;
  delayOutR[n] = inputR + DELAY_FEEDBACK * feedbackR;
}

const master = new Float64Array(TOTAL_SAMPLES * 2);
for (let n = 0; n < TOTAL_SAMPLES; n++) {
  const t = n / SAMPLE_RATE;
  // breathe oscillator modulating padGain's gain param (additive, as in the
  // original graph), then that pad carrier itself.
  const breathe = Math.sin(2 * Math.PI * BREATHE_HZ * t);
  const padAmplitude = PAD_GAIN + BREATHE_DEPTH * breathe;
  const pad = padAmplitude * Math.sin(2 * Math.PI * PAD_FREQUENCY * t);

  master[n * 2] = (notesL[n] + delayOutL[n] + pad) * MASTER_GAIN;
  master[n * 2 + 1] = (notesR[n] + delayOutR[n] + pad) * MASTER_GAIN;
}

// A continuous pad tone has no true silent point to loop at, so a short
// fade at each end masks the phase jump a looping player would otherwise
// click on — short enough to not blunt the first note's own 6ms attack.
const fadeSamples = Math.round(0.008 * SAMPLE_RATE);
for (let n = 0; n < fadeSamples; n++) {
  const inFactor = n / fadeSamples;
  master[n * 2] *= inFactor;
  master[n * 2 + 1] *= inFactor;
  const tail = TOTAL_SAMPLES - 1 - n;
  const outFactor = inFactor;
  master[tail * 2] *= outFactor;
  master[tail * 2 + 1] *= outFactor;
}

const pcm = new Int16Array(TOTAL_SAMPLES * 2);
for (let i = 0; i < pcm.length; i++) {
  const clamped = Math.max(-1, Math.min(1, master[i]));
  pcm[i] = Math.round(clamped * 32767);
}

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

writeFileSync(OUT_FILE, Buffer.concat([header, Buffer.from(pcm.buffer)]));
// eslint-disable-next-line no-undef -- plain Node script, run directly via `node`, not bundled
console.log(`Wrote ${OUT_FILE} (${DURATION_SECONDS}s, ${((44 + dataSize) / 1024) | 0} KiB)`);
