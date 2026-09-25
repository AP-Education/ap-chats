import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import sharp from 'sharp';

import { IMAGE_UPLOAD_POLICY } from './image-policy';

export interface SanitizedImage {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

// Adapted from backend-LMS's MetadataValidationStage + SharpSanitizeStage, merged into one pass
// since we only ever handle images here (no per-mime-type stage registry needed).
@Injectable()
export class ImageSanitizerService {
  async sanitize(buffer: Buffer): Promise<SanitizedImage> {
    const policy = IMAGE_UPLOAD_POLICY;

    if (buffer.length > policy.maxBytes) {
      throw new UnprocessableEntityException(`Image exceeds the ${policy.maxBytes} bytes limit`);
    }

    const sharpOptions = {
      failOn: policy.failOn,
      limitInputPixels: policy.maxPixels,
      unlimited: false,
      animated: false,
      sequentialRead: true,
    } as const;

    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(buffer, sharpOptions).metadata();
    } catch {
      throw new UnprocessableEntityException('Failed to read image metadata');
    }

    const { format, width, height, channels } = metadata;
    if (!format || !policy.allowedInputFormats.has(format)) {
      throw new UnprocessableEntityException(`Image format ${format} is not allowed`);
    }
    if (!width || !height) {
      throw new UnprocessableEntityException('Image dimensions are not valid');
    }
    if (width > policy.maxWidth || height > policy.maxHeight) {
      throw new UnprocessableEntityException(
        `Image dimensions ${width}x${height} exceed the ${policy.maxWidth}x${policy.maxHeight} limit`,
      );
    }
    if (width * height > policy.maxPixels) {
      throw new UnprocessableEntityException('Image has too many pixels');
    }
    if (typeof channels === 'number' && channels > policy.maxChannels) {
      throw new UnprocessableEntityException('Image has too many channels');
    }

    try {
      const safeBuffer = await sharp(buffer, sharpOptions)
        .rotate()
        .resize({
          width: policy.targetMaxDimensions,
          height: policy.targetMaxDimensions,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: policy.outputQuality, effort: policy.outputEffort })
        .toBuffer();

      return { buffer: safeBuffer, mimeType: 'image/webp', extension: 'webp' };
    } catch {
      throw new UnprocessableEntityException('Failed to sanitize image');
    }
  }
}
