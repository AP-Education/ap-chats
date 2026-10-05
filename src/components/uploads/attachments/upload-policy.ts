import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';

import { type AttachmentPolicy, MULTIPART_PART_BYTES, type StoredPart } from './types';

export interface PendingUploadLimits {
  maxFiles: number;
  maxBytes: number;
}

export function normalizeFilename(name: string): string {
  const normalized = name.normalize('NFC').split(/[\\/]/).at(-1)?.trim() ?? '';
  // eslint-disable-next-line no-control-regex
  const safe = normalized.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '');
  if (!safe || safe === '.' || safe === '..' || Buffer.byteLength(safe) > 255)
    throw new BadRequestException('Invalid filename');
  return safe;
}

export function partSize(size: number, number: number): number {
  if (!Number.isInteger(number) || number < 1 || number > Math.ceil(size / MULTIPART_PART_BYTES))
    throw new BadRequestException('Invalid part number');
  return Math.min(MULTIPART_PART_BYTES, size - (number - 1) * MULTIPART_PART_BYTES);
}

export function validateParts(size: number, parts: StoredPart[]): void {
  if (
    parts.length !== Math.ceil(size / MULTIPART_PART_BYTES) ||
    parts.some(
      (part, index) => part.number !== index + 1 || part.size !== partSize(size, index + 1),
    )
  )
    throw new BadRequestException('Uploaded parts do not match the declared file size');
}

@Injectable()
export class UploadPolicy {
  readonly limits: AttachmentPolicy;
  private readonly pending: PendingUploadLimits;

  constructor(config: AppConfigService) {
    this.limits = {
      maxFileBytes: config.get('CHAT_UPLOAD_MAX_FILE_BYTES'),
      maxMessageBytes: config.get('CHAT_UPLOAD_MAX_MESSAGE_BYTES'),
      maxFiles: config.get('CHAT_UPLOAD_MAX_FILES'),
      partBytes: MULTIPART_PART_BYTES,
    };
    this.pending = {
      maxFiles: config.get('CHAT_UPLOAD_MAX_PENDING_FILES'),
      maxBytes: config.get('CHAT_UPLOAD_MAX_PENDING_BYTES'),
    };
  }

  requireFile(size: number): void {
    if (!Number.isInteger(size) || size < 1 || size > this.limits.maxFileBytes)
      throw new BadRequestException('File exceeds the upload limit or is empty');
  }

  requireSelection(ids: string[]): void {
    if (ids.length > this.limits.maxFiles || new Set(ids).size !== ids.length)
      throw new BadRequestException('Too many or duplicate attachments');
  }

  requireReservationCapacity(reserved: { count: number; bytes: number }, size: number): void {
    if (reserved.count >= this.pending.maxFiles || reserved.bytes + size > this.pending.maxBytes)
      throw new ConflictException('Too many unfinished uploads');
  }
}
