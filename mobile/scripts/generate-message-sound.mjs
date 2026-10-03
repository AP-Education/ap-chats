import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

// Offline rendering of web/src/features/social/read-state/sound/messageBloop.ts.
const sampleRate = 44100;
const samples = new Float64Array(Math.round(sampleRate * 1.1));
const partials = [
  { ratio: 1, gain: 1, decayScale: 1 },
  { ratio: 2.01, gain: 0.45, decayScale: 0.55 },
  { ratio: 3.98, gain: 0.2, decayScale: 0.3 },
];

for (const [index, frequency] of [659.25, 987.77].entries()) {
  for (const partial of partials) {
    const start = index * 0.1;
    const attack = 0.006;
    const decay = 0.4 * partial.decayScale;
    const peak = 0.16 * partial.gain;
    const stop = start + attack + decay + 0.05;
    for (let n = Math.floor(start * sampleRate); n < Math.ceil(stop * sampleRate); n++) {
      const time = n / sampleRate - start;
      const envelope =
        time <= attack
          ? 0.0001 * Math.pow(peak / 0.0001, time / attack)
          : time <= attack + decay
            ? peak * Math.pow(0.0001 / peak, (time - attack) / decay)
            : 0.0001;
      samples[n] +=
        envelope * Math.sin(2 * Math.PI * frequency * partial.ratio * time) * Math.SQRT1_2;
    }
  }
}

const dry = samples.slice();
const echoDelay = Math.round(0.16 * sampleRate);
for (let repeat = 1; repeat <= 5; repeat++) {
  for (let n = repeat * echoDelay; n < samples.length; n++) {
    samples[n] += dry[n - repeat * echoDelay] * Math.pow(0.12, repeat - 1);
  }
}

const pcm = new Int16Array(samples.length * 2);
for (let n = 0; n < samples.length; n++) {
  const value = Math.round(Math.max(-1, Math.min(1, samples[n])) * 32767);
  pcm[n * 2] = value;
  pcm[n * 2 + 1] = value;
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.byteLength, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.byteLength, 40);
writeFileSync(
  fileURLToPath(new URL('../assets/sounds/message.wav', import.meta.url)),
  Buffer.concat([header, Buffer.from(pcm.buffer)]),
);
