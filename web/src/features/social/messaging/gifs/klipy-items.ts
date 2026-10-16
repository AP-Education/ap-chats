import type { GifBlock } from '../types';
import { gifPageUrl } from './gif-links';
import type { Gif, GifImage, PickedGif } from './types';

type KlipySize = 'hd' | 'md' | 'sm' | 'xs';
type KlipyFormat = 'gif' | 'webp' | 'mp4' | 'jpg';

export interface KlipyItem {
  slug: string;
  title: string;
  blur_preview?: string;
  file: Record<KlipySize, Partial<Record<KlipyFormat, GifImage>>>;
}

/** A KLIPY item as the app keeps it: only the fields it shows, never KLIPY's extras such as file size. */
export function toGif(item: KlipyItem): Gif {
  return {
    slug: item.slug,
    title: item.title,
    pageUrl: gifPageUrl(item.slug),
    preview: animated(item, 'sm'),
    image: animated(item, 'md'),
    placeholder: item.blur_preview ?? null,
  };
}

// Animated WebP is about half the GIF's weight and plays in an img on every supported browser.
function animated(item: KlipyItem, size: KlipySize): GifImage {
  const formats = item.file[size];
  const image = formats.webp ?? formats.gif;
  if (!image) throw new Error(`KLIPY item ${item.slug} has no ${size} image`);

  return { url: image.url, width: image.width, height: image.height };
}

/** A GIF as a message carries it: KLIPY's media URL exactly as returned, never a copy. */
export function gifBlock({ pageUrl, title, image }: PickedGif): GifBlock {
  return { type: 'gif', provider: 'klipy', link: pageUrl, title, media: image };
}
