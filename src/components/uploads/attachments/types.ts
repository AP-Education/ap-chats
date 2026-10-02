export interface Attachment {
  id: string;
  name: string;
  size: number;
  mediaType: string;
  preview: 'image' | 'video' | 'audio' | null;
  width: number | null;
  height: number | null;
  description: string | null;
}

export interface StoredPart {
  number: number;
  size: number;
  etag: string;
}

export interface AttachmentPolicy {
  maxFileBytes: number;
  maxMessageBytes: number;
  maxFiles: number;
  partBytes: number;
}

export const MULTIPART_PART_BYTES = 16 * 1024 * 1024;
export const UPLOAD_URL_SECONDS = 15 * 60;
export const DOWNLOAD_URL_SECONDS = 15 * 60;
export const UPLOAD_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const READY_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
