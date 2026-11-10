import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { ObjectStorage } from '@ap-education/storage';
import {
  identifyMedia,
  MEDIA_PREFIX_BYTES,
  MediaBusyError,
  MediaInspector,
  previewKeyOf,
} from '@ap-education/storage/media';
import { Injectable } from '@nestjs/common';

import type { Attachment } from '../messages/types/message.types';
import { attachmentMedia } from './attachment-media';
import { imagePlaceholder } from './image-placeholder';
import { MAX_VIDEO_PREVIEW_BYTES, videoPreview } from './video-preview';

type InspectedMedia = Pick<
  Attachment,
  'preview' | 'mediaType' | 'width' | 'height' | 'placeholder' | 'hasThumbnail' | 'duration'
>;

@Injectable()
export class AttachmentPreviewService {
  private rendering = false;
  private readonly waiting: (() => void)[] = [];
  constructor(
    private readonly storage: ObjectStorage,
    private readonly images: MediaInspector,
  ) {}

  async inspect(key: string, size: number): Promise<InspectedMedia> {
    const media = await identifyMedia(await this.readPrefix(key));
    const result = { ...media, width: null, height: null };
    if (media.preview === 'video' && size <= MAX_VIDEO_PREVIEW_BYTES)
      return this.withRenderSlot(() => this.videoThumbnail(key, size, result));
    if (media.preview !== 'image') return result;
    return this.withRenderSlot(async () => attachmentMedia(await this.images.inspect(key, size)));
  }

  private async videoThumbnail(
    key: string,
    size: number,
    fallback: InspectedMedia,
  ): Promise<InspectedMedia> {
    const directory = await mkdtemp(join(tmpdir(), 'ap-chat-video-'));
    try {
      const path = join(directory, 'original');
      let bytes = 0;
      const limit = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytes += chunk.length;
          callback(bytes > size ? new Error('Video exceeds its declared size') : null, chunk);
        },
      });
      let rendered: Awaited<ReturnType<typeof videoPreview>>;
      try {
        await pipeline(await this.storage.readObject(key), limit, createWriteStream(path), {
          signal: AbortSignal.timeout(30_000),
        });
        rendered = await videoPreview(path);
      } catch {
        return fallback;
      }
      const { image, width, height, duration } = rendered;
      const placeholder = await imagePlaceholder(image);
      await this.storage.putPrivateObject(previewKeyOf(key), image, 'image/webp');
      return { ...fallback, width, height, duration, placeholder, hasThumbnail: true };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private async readPrefix(key: string): Promise<Buffer> {
    const input = await this.storage.readObject(key, `bytes=0-${MEDIA_PREFIX_BYTES - 1}`);
    const chunks: Buffer[] = [];
    let count = 0;
    try {
      for await (const value of input) {
        const chunk = Buffer.from(value as Uint8Array);
        count += chunk.length;
        if (count > MEDIA_PREFIX_BYTES) throw new Error('Storage exceeded the requested range');
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
      if (this.waiting.length >= 4) throw new MediaBusyError();
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
}
