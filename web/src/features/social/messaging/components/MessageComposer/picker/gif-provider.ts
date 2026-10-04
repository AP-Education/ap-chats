// Google Tenor v2 — same provider Discord uses, so the picker's feel matches the
// reference UX. See VITE_TENOR_API_KEY in .env.example for how to enable it.
const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY?.trim();
const TENOR_CLIENT_KEY = 'ap-chats';
const RESULT_LIMIT = 24;

export interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
}

export function isGifSearchConfigured(): boolean {
  return Boolean(TENOR_API_KEY);
}

interface TenorResponse {
  results: {
    id: string;
    content_description: string;
    media_formats: { gif: { url: string }; tinygif?: { url: string } };
  }[];
}

export async function searchGifs(query: string, signal?: AbortSignal): Promise<GifResult[]> {
  if (!TENOR_API_KEY) return [];

  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    client_key: TENOR_CLIENT_KEY,
    limit: String(RESULT_LIMIT),
    media_filter: 'gif',
  });
  const trimmed = query.trim();
  const endpoint = trimmed
    ? `https://tenor.googleapis.com/v2/search?${params}&q=${encodeURIComponent(trimmed)}`
    : `https://tenor.googleapis.com/v2/featured?${params}`;

  const response = await fetch(endpoint, { signal });
  if (!response.ok) throw new Error(`Tenor request failed: ${response.status}`);
  const payload = (await response.json()) as TenorResponse;

  return payload.results.map((result) => ({
    id: result.id,
    title: result.content_description,
    previewUrl: result.media_formats.tinygif?.url ?? result.media_formats.gif.url,
    url: result.media_formats.gif.url,
  }));
}
