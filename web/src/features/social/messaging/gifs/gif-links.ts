import type { GifBlock } from '../types';

// The links a message shows as a GIF. The server reads the same ones in
// src/components/social/content/gif-links.ts.
const KLIPY_PAGE = /^\/gifs\/([\w-]+)\/?$/;
const GIPHY_PAGE = /^\/gifs\/(?:[\w-]*-)?([a-z0-9]+)\/?$/i;
const GIF_FILE = /\.(?:gif|webp)$/i;
const FILE_HOSTS: [RegExp, GifBlock['provider']][] = [
  [/^static\d*\.klipy\.com$/, 'klipy'],
  [/^(?:media\d*|i)\.giphy\.com$/, 'giphy'],
  [/^media\d*\.tenor\.com$/, 'tenor'],
];
// A link in <angle brackets> asks for no embed, as on Discord.
const LINK_IN_TEXT = /(?<!<)https:\/\/[^\s<>]+/g;
const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const TRAILING_PUNCTUATION = /[.,:;!?'")\]]+$/;

/** Where a GIF link leads: a KLIPY page to look up, or a file to show as it is. */
export type GifSource =
  { kind: 'klipy'; slug: string } | { kind: 'file'; provider: GifBlock['provider']; url: string };

function parseUrl(link: string): URL | null {
  try {
    return new URL(link.trim());
  } catch {
    return null;
  }
}

export function gifPageUrl(slug: string): string {
  return `https://klipy.com/gifs/${slug}`;
}

export function readGifLink(link: string): GifSource | null {
  const url = parseUrl(link);
  if (url?.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'klipy.com') {
    const slug = KLIPY_PAGE.exec(url.pathname)?.[1];
    return slug ? { kind: 'klipy', slug } : null;
  }

  // A GIPHY page names its GIF by id, and the file under that id needs no lookup.
  if (host === 'giphy.com') {
    const id = GIPHY_PAGE.exec(url.pathname)?.[1];
    const file = `https://media.giphy.com/media/${id}/giphy.webp`;
    return id ? { kind: 'file', provider: 'giphy', url: file } : null;
  }

  const provider = FILE_HOSTS.find(([pattern]) => pattern.test(host))?.[1];
  const isGifFile = provider && GIF_FILE.test(url.pathname);
  return isGifFile ? { kind: 'file', provider, url: url.href } : null;
}

/** The first GIF link outside code: the one a message shows, as Discord embeds it. */
export function firstGifLink(markdown: string): string | null {
  const prose = markdown.replace(CODE, ' ');
  for (const [match] of prose.matchAll(LINK_IN_TEXT)) {
    const link = match.replace(TRAILING_PUNCTUATION, '');
    if (readGifLink(link)) return link;
  }

  return null;
}

/** Nothing but a GIF link: the GIF shows alone, and a preview reads "GIF", as in Telegram. */
export function isLoneGifLink(markdown: string | null): boolean {
  return markdown !== null && readGifLink(markdown) !== null;
}
