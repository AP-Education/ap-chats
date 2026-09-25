import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { ImageSanitizerService } from './image-sanitizer.service';
import { StorageProvider } from './storage';

export interface UploadedFileResult {
  path: string;
  url: string;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly storage: StorageProvider,
    private readonly imageSanitizer: ImageSanitizerService,
  ) {}

  async upload(userId: string, buffer: Buffer): Promise<UploadedFileResult> {
    const sanitized = await this.imageSanitizer.sanitize(buffer);
    const path = `uploads/${userId}/${randomUUID()}.${sanitized.extension}`;

    await this.storage.uploadObject(path, sanitized.buffer, sanitized.mimeType);

    return { path, url: this.storage.buildFileUrl(path) };
  }
}
