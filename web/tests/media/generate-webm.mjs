import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

import { chromium } from '@playwright/test';

// Browser-generated VP8 keeps this fixture reproducible on FFmpeg builds without a VP8 encoder.
const temporary = await mkdtemp(join(tmpdir(), 'ap-fixture-webm-'));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
try {
  const page = await browser.newPage();
  const bytes = await page.evaluate(async () => {
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(4);
    const recorder = new globalThis.MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    let frame = 0;
    function draw() {
      context.fillStyle = '#185e73';
      context.fillRect(0, 0, 1280, 720);
      context.fillStyle = '#f1b866';
      context.fillRect(80 + frame++ * 50, 180, 240, 360);
    }
    draw();
    recorder.start();
    const timer = globalThis.setInterval(draw, 200);
    await new Promise((resolve) => globalThis.setTimeout(resolve, 1200));
    recorder.stop();
    await stopped;
    globalThis.clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    return Array.from(new Uint8Array(await new globalThis.Blob(chunks).arrayBuffer()));
  });
  const source = join(temporary, 'capture.webm');
  await writeFile(source, Buffer.from(bytes));
  // Remuxing adds a duration field to globalThis.MediaRecorder's streaming container; no video re-encoding.
  execFileSync('ffmpeg', [
    '-nostdin',
    '-y',
    '-v',
    'error',
    '-i',
    source,
    '-c',
    'copy',
    '-map_metadata',
    '-1',
    fileURLToPath(new URL('./public/media/sample.webm', import.meta.url)),
  ]);
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
