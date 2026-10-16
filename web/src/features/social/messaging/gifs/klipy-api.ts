import { type KlipyItem, toGif } from './klipy-items';
import type { Gif, GifPage } from './types';

// KLIPY, where Discord moved once Google shut the Tenor API down. Its terms ask for requests and
// media loads straight from the client, with media URLs used exactly as returned.
const APP_KEY = import.meta.env.VITE_KLIPY_API_KEY?.trim();
const PAGE_SIZE = 24;

interface KlipyResponse {
  result: boolean;
  data: { data: KlipyItem[]; has_next?: boolean; current_page?: number };
}

export function isGifSearchConfigured(): boolean {
  return Boolean(APP_KEY);
}

/** Trending GIFs for an empty query, matches otherwise; one page at a time. */
export async function searchGifs(query: string, page: number, signal?: AbortSignal) {
  const trimmed = query.trim();
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(PAGE_SIZE),
    content_filter: 'medium',
    ...(trimmed ? { q: trimmed } : {}),
  });
  const response = await request(`${trimmed ? 'search' : 'trending'}?${params}`, signal);

  return {
    gifs: response.data.data.map(toGif),
    nextPage: response.data.has_next ? page + 1 : null,
  } satisfies GifPage;
}

export async function findGif(slug: string, signal?: AbortSignal): Promise<Gif | null> {
  const params = new URLSearchParams({ slugs: slug });
  const response = await request(`items?${params}`, signal);
  const item = response.data.data[0];

  return item ? toGif(item) : null;
}

async function request(path: string, signal?: AbortSignal): Promise<KlipyResponse> {
  if (!APP_KEY) throw new Error('GIF search is not configured');

  const response = await fetch(`https://api.klipy.com/api/v1/${APP_KEY}/gifs/${path}`, { signal });
  if (!response.ok) throw new Error(`KLIPY request failed: ${response.status}`);

  return (await response.json()) as KlipyResponse;
}
