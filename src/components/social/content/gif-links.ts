// The links a message shows as a GIF. The client reads the same ones in
// web/src/features/social/messaging/gifs/gif-links.ts.
const GIF_PAGES = new Map([
  ['klipy.com', /^\/gifs\/[\w-]+\/?$/],
  ['giphy.com', /^\/gifs\/[\w-]+\/?$/],
]);
const GIF_HOST =
  /^(?:static\d*\.klipy\.com|media\d*\.giphy\.com|i\.giphy\.com|media\d*\.tenor\.com)$/;
const GIF_FILE = /\.(?:gif|webp)$/i;

/** The GIF services' own CDNs, the only hosts a GIF block may load from. */
export const GIF_MEDIA =
  /^https:\/\/(?:static\d*\.klipy\.com|media\d*\.giphy\.com|i\.giphy\.com|media\d*\.tenor\.com)\//;

/** A GIF service page, or a GIF file on one of their CDNs. */
export function isGifLink(link: string): boolean {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const host = url.hostname.replace(/^www\./, '');
  const page = GIF_PAGES.get(host);
  if (page) return page.test(url.pathname);

  return GIF_HOST.test(host) && GIF_FILE.test(url.pathname);
}
