import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';

import sharp from 'sharp';

import type { StorageProvider } from '@/components/uploads/storage';

import { AttachmentPreviewService } from './attachment-preview.service';
import { MAX_VIDEO_PREVIEW_BYTES, videoPreview } from './video-preview';

const run = promisify(execFile);
let directory: string;
let original: Buffer;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'ap-video-test-'));
  await run('ffmpeg', [
    '-nostdin',
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=320x180:rate=4:duration=1',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    join(directory, 'sample.mp4'),
  ]);
  original = await readFile(join(directory, 'sample.mp4'));
});

after(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

function storageFor(bytes: Buffer) {
  const reads: (string | undefined)[] = [];
  const writes: { key: string; data: Buffer; type: string }[] = [];
  return {
    reads,
    writes,
    provider: {
      readObject: async (_key: string, range?: string) => {
        reads.push(range);
        return Readable.from([range ? bytes.subarray(0, 4100) : bytes]);
      },
      putPrivateObject: async (key: string, data: Buffer, type: string) => {
        writes.push({ key, data, type });
      },
    } as unknown as StorageProvider,
  };
}

test('a real MP4 produces a private WebP, inspected dimensions, duration and placeholder', async () => {
  const storage = storageFor(original);
  const media = await new AttachmentPreviewService(storage.provider).inspect(
    'video',
    original.length,
  );
  assert.equal(media.preview, 'video');
  assert.equal(media.hasThumbnail, true);
  assert.equal(media.mediaType, 'video/mp4');
  assert.equal(media.width, 320);
  assert.equal(media.height, 180);
  assert.equal(media.duration, 1);
  assert.ok(media.placeholder);
  assert.deepEqual(storage.reads, ['bytes=0-4099', undefined]);
  assert.equal(storage.writes.length, 1);
  assert.equal(storage.writes[0]!.key, 'video.preview.webp');
  assert.equal(storage.writes[0]!.type, 'image/webp');
  const image = await sharp(storage.writes[0]!.data).metadata();
  assert.equal(image.format, 'webp');
  assert.equal(image.width, 320);
  assert.equal(image.height, 180);
});

test('phone rotation changes the display dimensions together with the decoded poster', async () => {
  const path = join(directory, 'rotated.mp4');
  await run('ffmpeg', [
    '-nostdin',
    '-v',
    'error',
    '-display_rotation',
    '90',
    '-i',
    join(directory, 'sample.mp4'),
    '-c',
    'copy',
    path,
  ]);
  const rendered = await videoPreview(path);
  assert.equal(rendered.width, 180);
  assert.equal(rendered.height, 320);
  const image = await sharp(rendered.image).metadata();
  assert.equal(image.width, 180);
  assert.equal(image.height, 320);
});

test('large videos keep playback without downloading the source to render a poster', async () => {
  const storage = storageFor(original);
  const media = await new AttachmentPreviewService(storage.provider).inspect(
    'large',
    MAX_VIDEO_PREVIEW_BYTES + 1,
  );
  assert.equal(media.preview, 'video');
  assert.equal(media.hasThumbnail, undefined);
  assert.deepEqual(storage.reads, ['bytes=0-4099']);
  assert.equal(storage.writes.length, 0);
});

test('a corrupt video falls back without publishing a fake thumbnail', async () => {
  const storage = storageFor(original.subarray(0, 40));
  const media = await new AttachmentPreviewService(storage.provider).inspect('corrupt', 40);
  assert.equal(media.preview, 'video');
  assert.equal(media.hasThumbnail, undefined);
  assert.equal(storage.writes.length, 0);
});

test('source bytes cannot exceed the declared size and temporary files are removed', async () => {
  const previous = new Set(
    (await readdir(tmpdir())).filter((name) => name.startsWith('ap-chat-video-')),
  );
  const storage = storageFor(original);
  const media = await new AttachmentPreviewService(storage.provider).inspect('oversized', 50);
  assert.equal(media.hasThumbnail, undefined);
  assert.equal(storage.writes.length, 0);
  const remaining = (await readdir(tmpdir())).filter((name) => name.startsWith('ap-chat-video-'));
  assert.ok(remaining.every((name) => previous.has(name)));
});

test('storage failure when publishing a poster remains retryable', async () => {
  const storage = storageFor(original);
  storage.provider.putPrivateObject = async () => {
    throw new Error('storage offline');
  };
  await assert.rejects(
    new AttachmentPreviewService(storage.provider).inspect('offline', original.length),
    /storage offline/,
  );
});
