import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import sharp from 'sharp';

const directory = fileURLToPath(new URL('./public/media/', import.meta.url));
mkdirSync(directory, { recursive: true });
for (const [name, size] of [
  ['sample', '320x180'],
  ['portrait', '180x320'],
]) {
  const video = `${directory}/${name}.mp4`;
  execFileSync('ffmpeg', [
    '-nostdin',
    '-y',
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    `testsrc2=size=${size}:rate=12:duration=2`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-map_metadata',
    '-1',
    video,
  ]);
  const frame = execFileSync('ffmpeg', [
    '-nostdin',
    '-v',
    'error',
    '-i',
    video,
    '-frames:v',
    '1',
    '-c:v',
    'mjpeg',
    '-f',
    'image2pipe',
    'pipe:1',
  ]);
  writeFileSync(`${directory}/${name}.webp`, await sharp(frame).webp().toBuffer());
}
