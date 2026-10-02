import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import sharp from 'sharp';

import { StorageProvider } from '../storage/storage.provider';
import type { Attachment } from './types';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;

export function identifyMedia(prefix: Buffer): {
  mediaType: string;
  preview: Attachment['preview'];
} {
  if (prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mediaType: 'image/png', preview: 'image' };
  if (prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255)
    return { mediaType: 'image/jpeg', preview: 'image' };
  if (['GIF87a', 'GIF89a'].includes(prefix.toString('ascii', 0, 6)))
    return { mediaType: 'image/gif', preview: 'image' };
  if (prefix.toString('ascii', 0, 4) === 'RIFF' && prefix.toString('ascii', 8, 12) === 'WEBP')
    return { mediaType: 'image/webp', preview: 'image' };
  if (prefix.toString('ascii', 4, 8) === 'ftyp' && prefix.length >= 12) {
    const brand = prefix.toString('ascii', 8, 12);
    if (['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(brand))
      return { mediaType: 'video/mp4', preview: 'video' };
    if (brand === 'M4A ') return { mediaType: 'audio/mp4', preview: 'audio' };
  }
  if (prefix.toString('ascii', 0, 4) === 'RIFF' && prefix.toString('ascii', 8, 12) === 'WAVE')
    return { mediaType: 'audio/wav', preview: 'audio' };
  if (
    prefix.toString('ascii', 0, 3) === 'ID3' ||
    (prefix[0] === 255 && ((prefix[1] ?? 0) & 0xe6) === 0xe2)
  )
    return { mediaType: 'audio/mpeg', preview: 'audio' };
  return { mediaType: 'application/octet-stream', preview: null };
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
    const input = await this.storage.readObject(key, 'bytes=0-511');
    const chunks: Buffer[] = [];
    let count = 0;
    try {
      for await (const value of input) {
        const chunk = Buffer.from(value as Uint8Array);
        count += chunk.length;
        if (count > 512) throw new Error('Storage exceeded the requested range');
        chunks.push(chunk);
      }
    } finally {
      input.destroy();
    }
    const media = identifyMedia(Buffer.concat(chunks));
    const result = { ...media, width: null, height: null };
    if (media.preview !== 'image') return result;
    if (size > MAX_IMAGE_BYTES) return { ...result, preview: null };
    if (this.rendering) {
      if (this.waiting.length >= 4)
        throw new ServiceUnavailableException('Preview processing is busy; retry completion');
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.rendering = true;
    try {
      return await this.thumbnail(key, size, result);
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
