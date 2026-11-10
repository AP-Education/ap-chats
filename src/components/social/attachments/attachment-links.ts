import type { LinkOptions } from '@ap-education/storage';
import { isBrowserImage, previewKeyOf } from '@ap-education/storage/media';

import type { Attachment } from '../messages/types/message.types';

export type DownloadVariant = 'download' | 'preview' | 'thumbnail';

/** What a signed link reads, and how. */
export interface Link {
  key: string;
  options: LinkOptions;
}

// An image link stays the same for an hour, so a browser keeps the photos it already loaded.
const IMAGE_LINK_SECONDS = 60 * 60;

/** Where a workspace keeps the file of an upload. */
export function attachmentObjectKey(workspaceId: string, uploadId: string): string {
  return `chat-attachments/${workspaceId}/${uploadId}`;
}

// An image shows by its WebP preview unless a browser shows the original itself; neither link names it.
export function imageLinkOf(
  key: string,
  mediaType: string,
  variant: 'thumbnail' | 'preview',
): Link {
  const showsOriginal = variant === 'preview' && isBrowserImage(mediaType);
  if (showsOriginal) return { key, options: { mediaType, lifetime: IMAGE_LINK_SECONDS } };

  return { key: previewKeyOf(key), options: { lifetime: IMAGE_LINK_SECONDS } };
}

/** What a link reads: the file saved under its name, an image, or a video or audio played in place. */
export function linkOf(key: string, file: Attachment, variant: DownloadVariant): Link | null {
  const { name, mediaType, preview } = file;
  if (variant === 'download') return { key, options: { mediaType, saveAs: name } };
  if (preview === 'image') return imageLinkOf(key, mediaType, variant);

  const isPlayed = variant === 'preview' && preview !== null;
  if (!isPlayed) return null;

  return { key, options: { mediaType } };
}
