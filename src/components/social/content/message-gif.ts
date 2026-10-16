import { isGifLink } from './gif-links';

/**
 * A GIF as a message keeps it: the media URL as its service serves it, loaded straight from that
 * CDN by every client, since KLIPY allows neither server requests nor copies of its media.
 */
export interface MessageGif {
  provider: 'klipy' | 'giphy' | 'tenor';
  /** The GIF link in the text it shows for. */
  link: string;
  title: string;
  media: { url: string; width: number; height: number; placeholder?: string };
}

function sameLink(left: string, right: string): boolean {
  try {
    return new URL(left).href === new URL(right).href;
  } catch {
    return false;
  }
}

function isLinked(gif: MessageGif, links: string[]): boolean {
  return isGifLink(gif.link) && links.some((link) => sameLink(link, gif.link));
}

/**
 * A GIF the client brings shows only for a GIF link the text makes, like Discord's embeds. One
 * without its link is left out rather than refused, so a GIF never costs the message itself.
 */
export function linkedGif(gif: MessageGif | undefined, links: string[]): MessageGif | null {
  return gif && isLinked(gif, links) ? gif : null;
}

/** Nothing but its GIF's link: the GIF shows alone, and a preview reads "GIF", as in Telegram. */
export function isLoneGif(markdown: string, gif: MessageGif | null): boolean {
  return gif !== null && markdown.trim() === gif.link;
}

/** An edit that brings no GIF keeps the current one while its link stays. */
export function keptGif(current: MessageGif | null, links: string[]): MessageGif | null {
  return current && isLinked(current, links) ? current : null;
}
