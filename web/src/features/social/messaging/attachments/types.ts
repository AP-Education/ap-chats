import type { UploadDraft } from '@ap-education/timeline/composer';

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
  hasThumbnail?: boolean;
  duration?: number;
}

/** The links an image shows by, signed for a while; any other file is asked for when opened. */
export interface AttachmentLinks {
  thumbnail?: string;
  preview?: string;
}

/**
 * A file a message carries. Read from the history it comes with its links, empty for anything but
 * an image; a message just sent or still on its way has none.
 */
export interface MessageAttachment extends Attachment {
  links?: AttachmentLinks;
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

/** A file on its way, as the composer and a waiting message show it. */
export type AttachmentDraft = UploadDraft<Attachment>;
