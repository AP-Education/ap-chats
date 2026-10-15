import type { GifImage, GifPage, GifResult } from '../types';

// KLIPY, as web/src/features/social/messaging/gifs/klipy-api.ts: Google shut the Tenor API down.
// Its terms ask for requests and media loads straight from the client.
const APP_KEY = process.env.EXPO_PUBLIC_KLIPY_API_KEY?.trim();
const PAGE_SIZE = 24;

type KlipyFormats = Partial<Record<'gif' | 'webp', GifImage>>;

interface KlipyResponse {
  data: {
    data: { slug: string; title: string; file: { sm: KlipyFormats; md: KlipyFormats } }[];
    has_next?: boolean;
  };
}

// Only what the app shows; KLIPY's extras, such as file size, are not part of a message.
function image({ url, width, height }: GifImage): GifImage {
  return { url, width, height };
}

export function isGifSearchConfigured(): boolean {
  return Boolean(APP_KEY);
}

/** Trending GIFs for an empty query, matches otherwise; one page at a time. */
export async function searchGifs(query: string, page: number, signal?: AbortSignal) {
  if (!APP_KEY) return { gifs: [], nextPage: null } satisfies GifPage;

  const trimmed = query.trim();
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(PAGE_SIZE),
    content_filter: 'medium',
    ...(trimmed ? { q: trimmed } : {}),
  });
  const endpoint = `https://api.klipy.com/api/v1/${APP_KEY}/gifs/${trimmed ? 'search' : 'trending'}`;

  const response = await fetch(`${endpoint}?${params}`, { signal });
  if (!response.ok) throw new Error(`KLIPY request failed: ${response.status}`);
  const payload = (await response.json()) as KlipyResponse;

  // The tile is a GIF, which React Native animates on Android out of the box, unlike WebP.
  const gifs = payload.data.data.flatMap(({ slug, title, file }): GifResult[] => {
    const preview = file.sm.gif;
    const media = file.md.webp ?? file.md.gif;
    return preview && media ? [{ slug, title, preview: image(preview), media: image(media) }] : [];
  });

  return { gifs, nextPage: payload.data.has_next ? page + 1 : null } satisfies GifPage;
}
