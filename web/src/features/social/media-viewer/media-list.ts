import { isLoneGifLink } from '../messaging/gifs/gif-links';
import type { HistoryItem } from '../messaging/types';
import { isMessageItem } from '../messaging/types';
import type { MediaSource, ViewerMedia } from './types';

export function mediaKey(messageId: string, part: string): string {
  return `${messageId}:${part}`;
}

/** Every photo, video and GIF in the loaded history, oldest first: what the viewer swipes through. */
export function conversationMedia(items: HistoryItem[]): ViewerMedia[] {
  return items.filter(isMessageItem).flatMap((item) => {
    const { message } = item;
    if (message.markdown === null) return [];

    const files = (message.attachments ?? []).flatMap((attachment): [string, MediaSource][] =>
      attachment.preview === 'image' || attachment.preview === 'video'
        ? [[attachment.id, { kind: attachment.preview, attachment }]]
        : [],
    );
    const gifs = (message.blocks ?? []).map((block): [string, MediaSource] => [
      'gif',
      { kind: 'gif', block },
    ]);
    const sources = [...files, ...gifs];
    // A GIF sent as a bare link says nothing besides the GIF itself.
    const caption =
      message.markdown.trim() && !isLoneGifLink(message.markdown) ? message.markdown : null;

    return sources.map(([part, source], index) => ({
      key: mediaKey(message.id, part),
      item,
      source,
      caption,
      position: { index, total: sources.length },
    }));
  });
}
