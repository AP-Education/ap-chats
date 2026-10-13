#!/usr/bin/env node
// Offline renders of web/src/features/calls/sound/ringback.ts and busyTone.ts,
// same envelope as telephoneTone.ts. Re-run after changing their constants.
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/sounds');

const EDGE_SECONDS = 0.015;
const TONE_GAIN = 0.12;

// Mirrors scheduleTelephoneTone() in web/src/features/calls/sound/telephoneTone.ts.
function addTone(samples, { frequencies, startTime, duration }) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const stopSample = Math.min(samples.length, Math.ceil((startTime + duration) * SAMPLE_RATE));

  for (let n = startSample; n < stopSample; n++) {
    const t = n / SAMPLE_RATE - startTime;
    const edge = Math.min(t, duration - t);
    const envelope = TONE_GAIN * Math.min(1, edge / EDGE_SECONDS);
    for (const frequency of frequencies) {
      samples[n] += envelope * Math.sin(2 * Math.PI * frequency * t);
    }
  }
}

function writeWav(fileName, samples) {
  const pcm = Int16Array.from(samples, (sample) =>
    Math.round(Math.max(-1, Math.min(1, sample)) * 32767),
  );
  const dataSize = pcm.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const outFile = resolve(OUT_DIR, fileName);
  writeFileSync(outFile, Buffer.concat([header, Buffer.from(pcm.buffer)]));
  // eslint-disable-next-line no-undef -- plain Node script, run directly via `node`, not bundled
  console.log(`Wrote ${outFile} (${((44 + dataSize) / 1024).toFixed(1)} KiB)`);
}

// One whole on/off cycle, so the player loops it gaplessly: ringback.ts's 2 s on, 4 s off.
const ringback = new Float64Array(6 * SAMPLE_RATE);
addTone(ringback, { frequencies: [440, 480], startTime: 0, duration: 2 });
writeWav('ringback.wav', ringback);

// busyTone.ts's three half-second beeps, without the trailing silence.
const busy = new Float64Array(2.5 * SAMPLE_RATE);
for (let beep = 0; beep < 3; beep++) {
  addTone(busy, { frequencies: [480, 620], startTime: beep, duration: 0.5 });
}
writeWav('busy.wav', busy);
