import type { DumpedGif } from './dump-format';

interface EmbedMedia {
  canonicalUrl?: string;
  width?: number;
  height?: number;
}

/** What Discord kept of a link it showed as a card: for a GIF, the media its service serves. */
export interface GifEmbed {
  title: string;
  url: string | null;
  thumbnail?: EmbedMedia | null;
  video?: EmbedMedia | null;
}

// The links our messages show as GIFs, as src/components/social/content/gif-links.ts reads them.
const LINK_IN_TEXT = /(?<!<)https:\/\/[^\s<>]+/g;
const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const TRAILING_PUNCTUATION = /[.,:;!?'")\]]+$/;
const KLIPY_PAGE = /^https:\/\/(?:www\.)?klipy\.com\/gifs\/[\w-]+\/?$/;
const GIPHY_PAGE = /^https:\/\/(?:www\.)?giphy\.com\/gifs\/(?:[\w-]*-)?([a-z0-9]+)\/?$/i;
const TENOR_PAGE = /^https:\/\/(?:www\.)?tenor\.com\/view\//;
const KLIPY_MEDIA = /^https:\/\/static\d*\.klipy\.com\/.+\.(?:gif|webp)$/i;
const GIF_FILE =
  /^https:\/\/(?:static\d*\.klipy\.com|media\d*\.giphy\.com|i\.giphy\.com|media\d*\.tenor\.com)\/.+\.(?:gif|webp)$/i;
// Tenor names a file's format in its id: AAAPo is the clip, AAAAC the same GIF.
const TENOR_CLIP = /^(https:\/\/media\d*\.tenor\.com\/[\w-]+?)AAAPo(\/.+)\.mp4$/;

const sameLink = (left: string, right: string) => {
  try {
    return new URL(left).href === new URL(right).href;
  } catch {
    return false;
  }
};

function providerOf(link: string): DumpedGif['provider'] {
  if (link.includes('klipy.com')) return 'klipy';
  return link.includes('giphy.com') ? 'giphy' : 'tenor';
}

function sizeOf(embed: GifEmbed): { width: number; height: number } | null {
  const media = embed.thumbnail?.width ? embed.thumbnail : embed.video;
  return media?.width && media.height ? { width: media.width, height: media.height } : null;
}

// Where the GIF behind a link is served, and the link our text shows for it.
function mediaOf(link: string, embed: GifEmbed): { url: string; link: string } | null {
  if (KLIPY_PAGE.test(link)) {
    const url = embed.thumbnail?.canonicalUrl;
    return url && KLIPY_MEDIA.test(url) ? { url, link } : null;
  }
  const giphyId = GIPHY_PAGE.exec(link)?.[1];
  if (giphyId) return { url: `https://media.giphy.com/media/${giphyId}/giphy.webp`, link };

  // A Tenor page is no GIF link of ours, so the text shows the GIF's own file in its place.
  if (TENOR_PAGE.test(link)) {
    const clip = TENOR_CLIP.exec(embed.video?.canonicalUrl ?? '');
    const file = clip && `${clip[1]}AAAAC${clip[2]}.gif`;
    return file ? { url: file, link: file } : null;
  }
  return GIF_FILE.test(link) ? { url: link, link } : null;
}

/**
 * The GIF of a message's first GIF link outside code, from the card Discord made of it: the
 * service's own media URL and size, never a copy. `typed` is the link as the text has it.
 */
export function embeddedGif(
  content: string,
  embeds: GifEmbed[],
): { gif: DumpedGif; typed: string } | null {
  const prose = content.replace(CODE, ' ');
  for (const [match] of prose.matchAll(LINK_IN_TEXT)) {
    const typed = match.replace(TRAILING_PUNCTUATION, '');
    const embed = embeds.find((card) => card.url && sameLink(card.url, typed));
    const media = embed && mediaOf(typed, embed);
    const size = embed && sizeOf(embed);
    if (!embed || !media || !size) continue;

    return {
      typed,
      gif: {
        provider: providerOf(media.url),
        link: media.link,
        title: embed.title || 'GIF',
        media: { url: media.url, ...size },
      },
    };
  }
  return null;
}
