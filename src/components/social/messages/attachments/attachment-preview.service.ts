import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

import { StorageProvider } from '@/components/uploads/storage/storage.provider';

import type { Attachment } from './types';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;

// file-type's own signature library: maintained against the real corpus of
// container formats (zip-based docs, webm/mkv, heic, ...) instead of the
// handful of magic bytes we'd otherwise hand-roll and slowly rot.
const PREFIX_BYTES = 4100;

// Unlike images (sharp either decodes one or inspect() falls back to
// preview: null, so any detected image/* is safe to try), a video/audio
// preview goes straight to an HTML5 <video>/<audio> tag with no decode check
// in between — so this stays a deliberate allowlist of formats browsers
// reliably play, not everything file-type can merely identify.
const PREVIEWABLE_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const PREVIEWABLE_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg']);

export async function identifyMedia(prefix: Buffer): Promise<{
  mediaType: string;
  preview: Attachment['preview'];
}> {
  const detected = await fileTypeFromBuffer(prefix);
  if (!detected) return { mediaType: 'application/octet-stream', preview: null };
  const preview = detected.mime.startsWith('image/')
    ? 'image'
    : PREVIEWABLE_VIDEO_TYPES.has(detected.mime)
      ? 'video'
      : PREVIEWABLE_AUDIO_TYPES.has(detected.mime)
        ? 'audio'
        : null;
  return { mediaType: detected.mime, preview };
}

@Injectable()
export class AttachmentPreviewService {
  private rendering = false;
  private readonly waiting: (() => void)[] = [];
  constructor(private readonly storage: StorageProvider) {}

  async inspect(
    key: string,
    size: number,
  ): Promise<Pick<Attachment, 'preview' | 'mediaType' | 'width' | 'height'>> {
    const media = await identifyMedia(await this.readPrefix(key));
    const result = { ...media, width: null, height: null };
    if (media.preview !== 'image') return result;
    if (size > MAX_IMAGE_BYTES) return { ...result, preview: null };
    return this.withRenderSlot(() => this.thumbnail(key, size, result));
  }

  private async readPrefix(key: string): Promise<Buffer> {
    const input = await this.storage.readObject(key, `bytes=0-${PREFIX_BYTES - 1}`);
    const chunks: Buffer[] = [];
    let count = 0;
    try {
      for await (const value of input) {
        const chunk = Buffer.from(value as Uint8Array);
        count += chunk.length;
        if (count > PREFIX_BYTES) throw new Error('Storage exceeded the requested range');
        chunks.push(chunk);
      }
    } finally {
      input.destroy();
    }
    return Buffer.concat(chunks);
  }

  /** Runs `render` with at most one thumbnail job at a time, queueing up to 4 callers before shedding load. */
  private async withRenderSlot<T>(render: () => Promise<T>): Promise<T> {
    if (this.rendering) {
      if (this.waiting.length >= 4)
        throw new ServiceUnavailableException('Preview processing is busy; retry completion');
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.rendering = true;
    try {
      return await render();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.rendering = false;
    }
  }

  private async thumbnail(
    key: string,
    size: number,
    fallback: Pick<Attachment, 'preview' | 'mediaType' | 'width' | 'height'>,
  ): Promise<Pick<Attachment, 'preview' | 'mediaType' | 'width' | 'height'>> {
    const directory = await mkdtemp(join(tmpdir(), 'ap-chat-preview-'));
    try {
      const path = join(directory, 'original');
      let bytes = 0;
      const limit = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytes += chunk.length;
          callback(bytes > size ? new Error('Image exceeds its declared size') : null, chunk);
        },
      });
      await pipeline(await this.storage.readObject(key), limit, createWriteStream(path), {
        signal: AbortSignal.timeout(60_000),
      });
      const options = {
        limitInputPixels: MAX_PIXELS,
        sequentialRead: true,
        animated: false,
        failOn: 'error',
      } as const;
      let output: Buffer;
      let metadata: sharp.Metadata;
      try {
        metadata = await sharp(path, options).metadata();
        if (
          !metadata.width ||
          !metadata.height ||
          metadata.width * metadata.height > MAX_PIXELS ||
          metadata.width > 10_000 ||
          metadata.height > 10_000
        )
          return { ...fallback, preview: null };
        output = await sharp(path, options)
          .timeout({ seconds: 30 })
          .rotate()
          .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80, effort: 2 })
          .toBuffer();
      } catch {
        return { ...fallback, preview: null };
      }
      await this.storage.putPrivateObject(`${key}.preview.webp`, output, 'image/webp');
      return { ...fallback, preview: 'image', width: metadata.width!, height: metadata.height! };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
