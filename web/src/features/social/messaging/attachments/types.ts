export interface Attachment {
  id: string;
  name: string;
  size: number;
  mediaType: string;
  preview: 'image' | 'video' | 'audio' | null;
  width: number | null;
  height: number | null;
  description: string | null;
  /** An image's ThumbHash: its colours and a blurred stand-in before it loads. */
  placeholder?: string;
}

export interface AttachmentPolicy {
  maxFileBytes: number;
  maxMessageBytes: number;
  maxFiles: number;
  partBytes: number;
}

export interface UploadScope {
  workspaceId: string;
  channelId: string;
}

export interface AttachmentDraft {
  key: string;
  name: string;
  size: number;
  status: 'queued' | 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  previewUrl?: string;
  attachment?: Attachment;
  description: string;
  error?: string;
}

export interface UploadSession {
  id: string;
  partBytes: number;
  expiresAt: string;
}
