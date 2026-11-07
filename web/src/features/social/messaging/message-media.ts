import type { MediaItem } from '@ap-education/ui/media';
import { thumbHashImage } from '@ap-education/ui/thumbhash';

import type { AttachmentLinks, MessageAttachment } from './attachments/types';
import { isLoneGif } from './gifs/gif-links';
import type { ChatEntry } from './timeline/chat-entry';
import type { GifBlock } from './types';

/** A photo or video stored with a message, whose addresses the Chats API signs. */
export interface AttachmentMedia extends MediaItem {
  kind: 'image' | 'video';
  messageId: string;
  attachmentId: string;
  /** The links its message brought, so it shows at once; anything else is asked for. */
  links: AttachmentLinks;
}

/** A GIF, served straight from its service's CDN. */
export interface GifMedia extends MediaItem {
  kind: 'gif';
  src: string;
}

/** A message's photo, video or GIF, as its bubble and the media viewer show it. */
export type ChatMedia = AttachmentMedia | GifMedia;

/** The key a bubble and its slide in the viewer share. */
export function mediaKey(messageId: string, part: string): string {
  return `${messageId}:${part}`;
}

export function attachmentMedia(
  messageId: string,
  attachment: MessageAttachment,
  caption?: string,
): AttachmentMedia {
  const { id, name, width, height, placeholder, links = {} } = attachment;
  // A file stored before its size was known takes the viewer's common proportions.
  const size = width && height ? { width, height } : undefined;

  return {
    key: mediaKey(messageId, id),
    kind: attachment.preview === 'video' ? 'video' : 'image',
    alt: attachment.description || name,
    size,
    name,
    standIn: placeholder && thumbHashImage(placeholder),
    caption,
    messageId,
    attachmentId: id,
    links,
  };
}

export function gifMedia(messageId: string, block: GifBlock, caption?: string): GifMedia {
  const { url, width, height, placeholder } = block.media;

  return {
    key: mediaKey(messageId, 'gif'),
    kind: 'gif',
    alt: block.title || 'GIF',
    size: { width, height },
    src: url,
    standIn: placeholder && thumbHashImage(placeholder),
    caption,
  };
}

/** A message's photos, videos and GIFs in the order it shows them; the viewer pages through these. */
export function messageMedia(entry: ChatEntry): ChatMedia[] {
  if (entry.kind !== 'MESSAGE') return [];

  const { message } = entry.payload.item;
  if (message.markdown === null) return [];

  // A GIF sent as a bare link says nothing besides the GIF itself.
  const hasCaption = message.markdown.trim() && !isLoneGif(message);
  const caption = hasCaption ? message.markdown : undefined;
  const files = (message.attachments ?? [])
    .filter((attachment) => attachment.preview === 'image' || attachment.preview === 'video')
    .map((attachment) => attachmentMedia(message.id, attachment, caption));
  const gifs = (message.blocks ?? []).map((block) => gifMedia(message.id, block, caption));

  return [...files, ...gifs];
}
