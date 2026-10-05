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

export interface AttachmentRef {
  id: string;
  description?: string;
}

export interface StoredPart {
  number: number;
  size: number;
  etag: string;
}

export type UploadState = 'uploading' | 'ready' | 'attached' | 'cancelled';

export interface ChatUpload {
  id: string;
  workspaceId: string;
  channelId: string | null;
  ownerMemberId: string | null;
  name: string;
  size: number;
  objectKey: string;
  multipartId: string;
  state: UploadState;
  processingToken: string | null;
  processingUntil: Date | null;
  metadata: Attachment | null;
  createdAt: Date;
  expiresAt: Date;
}

// Everything a new upload needs is already shaped like the row it becomes —
// except channelId/ownerMemberId, which a live row requires but the full
// ChatUpload only keeps nullable for later (a channel or member deletion can
// null them out via an FK `ON DELETE SET NULL`, never an insert).
export interface NewChatUpload extends Pick<
  ChatUpload,
  'id' | 'workspaceId' | 'name' | 'size' | 'objectKey' | 'multipartId' | 'expiresAt'
> {
  channelId: string;
  ownerMemberId: string;
}

export type ChatUploadPatch = Partial<
  Pick<ChatUpload, 'state' | 'processingToken' | 'processingUntil' | 'expiresAt'>
> & {
  // Never cleared back to null through a patch, unlike the row's own field.
  metadata?: Attachment;
};

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
