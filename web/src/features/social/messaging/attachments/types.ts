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
  /** A recorded voice note; duration is derived from the stored audio by the API. */
  voice?: { durationMs: number };
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

/** A native recording is an opaque local handle, never bytes or a device file URL. */
export interface UploadFile extends Pick<
  File,
  'name' | 'size' | 'type' | 'lastModified' | 'slice'
> {
  voice?: true;
  nativeRecordingId?: string;
}
