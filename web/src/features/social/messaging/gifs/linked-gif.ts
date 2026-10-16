import { loadReadableImage, readPlaceholder } from '../media/placeholder';
import type { GifBlock } from '../types';
import { readGifLink } from './gif-links';
import { findGif, isGifSearchConfigured } from './klipy-api';
import { gifBlock } from './klipy-items';

const MEASURE_POLL_MS = 50;
const MEASURE_LIMIT_MS = 10_000;
// The tint is a nicety: a GIF that is slow to decode goes without it rather than holding the send.
const PLACEHOLDER_TIMEOUT_MS = 800;

// A GIF's size arrives with its first bytes, so measuring never waits for the whole file. Loaded
// readable, as the placeholder is read from the same request.
function measureImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const startedAt = Date.now();
    let failed = false;
    image.crossOrigin = 'anonymous';
    image.onerror = () => {
      failed = true;
      reject(new Error(`Not an image: ${url}`));
    };
    image.src = url;

    const poll = () => {
      if (failed) return;
      if (image.naturalWidth > 0) {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      } else if (Date.now() - startedAt > MEASURE_LIMIT_MS) {
        reject(new Error(`No size for ${url}`));
      } else {
        setTimeout(poll, MEASURE_POLL_MS);
      }
    };
    poll();
  });
}

/** The block with its ThumbHash, read from a small stand-in when one is at hand, else the GIF. */
export async function withPlaceholder(
  block: GifBlock,
  source = block.media.url,
): Promise<GifBlock> {
  if (block.media.placeholder) return block;

  const timeout = new Promise<null>((resolve) => setTimeout(resolve, PLACEHOLDER_TIMEOUT_MS, null));
  const read = loadReadableImage(source).then(readPlaceholder);
  const placeholder = await Promise.race([read, timeout]).catch(() => null);

  return placeholder ? { ...block, media: { ...block.media, placeholder } } : block;
}

/**
 * The block for a GIF link: a KLIPY page looked up through its API, as KLIPY asks, and any other
 * GIF file measured right in the browser, with nothing to look up.
 */
export async function linkedGifBlock(link: string, signal?: AbortSignal): Promise<GifBlock | null> {
  const source = readGifLink(link);
  if (!source) return null;

  if (source.kind === 'klipy') {
    if (!isGifSearchConfigured()) return null;
    const gif = await findGif(source.slug, signal);
    return gif && withPlaceholder({ ...gifBlock(gif), link }, gif.placeholder ?? undefined);
  }

  const size = await measureImage(source.url);
  return withPlaceholder({
    type: 'gif',
    provider: source.provider,
    link,
    title: 'GIF',
    media: { url: source.url, ...size },
  });
}
