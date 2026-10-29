import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';

import { ServiceUnavailableException } from '@nestjs/common';
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

test('WebM uses the same bounded poster and keeps the original display dimensions', async () => {
  const bytes = await readFile('web/tests/media/public/media/sample.webm');
  const storage = storageFor(bytes);
  const media = await new AttachmentPreviewService(storage.provider).inspect('webm', bytes.length);
  assert.equal(media.mediaType, 'video/webm');
  assert.equal(media.hasThumbnail, true);
  assert.equal(media.width, 1280);
  assert.equal(media.height, 720);
  const poster = await sharp(storage.writes[0]!.data).metadata();
  assert.equal(poster.width, 960);
  assert.equal(poster.height, 540);
});

test('the exact 64 MiB metadata boundary is still eligible for a poster', async () => {
  const storage = storageFor(original);
  const media = await new AttachmentPreviewService(storage.provider).inspect(
    'boundary',
    MAX_VIDEO_PREVIEW_BYTES,
  );
  assert.equal(media.hasThumbnail, true);
  assert.equal(storage.writes.length, 1);
});

test('audio-only MP4 cannot masquerade as a video stream', async () => {
  const path = join(directory, 'audio.mp4');
  await run('ffmpeg', [
    '-nostdin',
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=0.2',
    '-c:a',
    'aac',
    path,
  ]);
  await assert.rejects(videoPreview(path), /Unsupported video metadata/);
});

test('the media decoder rejects network protocols instead of fetching a remote source', async () => {
  await assert.rejects(videoPreview('http://127.0.0.1:9/video.mp4'), /not on whitelist/);
});

test('a failed source read falls back and frees the render slot for a later upload', async () => {
  const storage = storageFor(original);
  const read = storage.provider.readObject;
  let offline = true;
  storage.provider.readObject = async (key, range) => {
    if (!range && offline) throw new Error('source unavailable');
    return read(key, range);
  };
  const service = new AttachmentPreviewService(storage.provider);
  assert.equal((await service.inspect('failed', original.length)).hasThumbnail, undefined);
  assert.equal(storage.writes.length, 0);
  offline = false;
  assert.equal((await service.inspect('recovered', original.length)).hasThumbnail, true);
});

test('a source that stalls is aborted, closed and left without a fake poster', async (t) => {
  const storage = storageFor(original);
  const stalled = new Readable({ read() {} });
  storage.provider.readObject = async (_key, range) =>
    range ? Readable.from([original.subarray(0, 4100)]) : stalled;
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, 'timeout', () => timeout(10));
  const keepAlive = setTimeout(() => undefined, 1000);
  t.after(() => clearTimeout(keepAlive));
  const media = await new AttachmentPreviewService(storage.provider).inspect(
    'stalled',
    original.length,
  );
  assert.equal(media.hasThumbnail, undefined);
  assert.equal(stalled.destroyed, true);
  assert.equal(storage.writes.length, 0);
});

test('a storage server exceeding the requested prefix cannot enter the renderer', async () => {
  const storage = storageFor(original);
  storage.provider.readObject = async () => Readable.from([Buffer.alloc(4101)]);
  await assert.rejects(
    new AttachmentPreviewService(storage.provider).inspect('bad-range', 4101),
    /exceeded the requested range/,
  );
  assert.equal(storage.writes.length, 0);
});

test('photos and videos share one renderer, four waiting slots and a retryable overload response', async () => {
  const photo = await sharp({
    create: { width: 64, height: 48, channels: 3, background: '#186b61' },
  })
    .png()
    .toBuffer();
  let entered!: () => void;
  let release!: () => void;
  const reading = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let active = 0;
  let peak = 0;
  const written: string[] = [];
  const provider = {
    readObject: async (key: string, range?: string) => {
      const bytes = key === 'photo' ? photo : original;
      if (range) return Readable.from([bytes.subarray(0, 4100)]);
      peak = Math.max(peak, ++active);
      if (key === 'photo') {
        entered();
        await held;
      }
      return Readable.from([bytes]);
    },
    putPrivateObject: async (key: string) => {
      written.push(key);
      active--;
    },
  } as unknown as StorageProvider;
  const service = new AttachmentPreviewService(provider);
  const first = service.inspect('photo', photo.length);
  await reading;
  const pending = Array.from({ length: 5 }, (_, index) =>
    service.inspect(`video-${index}`, original.length),
  );
  const outcomes = pending.map((promise) =>
    promise.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    ),
  );
  try {
    const refusal = await Promise.any(
      pending.map((promise) =>
        promise.then(
          () => Promise.reject(new Error('unexpected early success')),
          (error: unknown) => error,
        ),
      ),
    );
    assert.ok(refusal instanceof ServiceUnavailableException);
  } finally {
    release();
  }
  assert.equal((await first).preview, 'image');
  const settled = await Promise.all(outcomes);
  assert.equal(settled.filter((result) => 'value' in result).length, 4);
  assert.equal(settled.filter((result) => 'error' in result).length, 1);
  assert.equal(written.length, 5);
  assert.equal(peak, 1);
  assert.equal((await service.inspect('after-overload', original.length)).hasThumbnail, true);
});
