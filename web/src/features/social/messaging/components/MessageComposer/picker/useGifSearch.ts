import { useEffect, useState } from 'react';

import { type GifResult, searchGifs } from './gif-provider';

const SEARCH_DEBOUNCE_MS = 350;

export interface GifSearch {
  status: 'searching' | 'failed' | 'ready';
  results: GifResult[];
}

export function useGifSearch(query: string, enabled: boolean): GifSearch {
  const [search, setSearch] = useState<GifSearch>({ status: 'searching', results: [] });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setSearch((current) => ({ ...current, status: 'searching' }));
      searchGifs(query, controller.signal)
        .then((results) => setSearch({ status: 'ready', results }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error('GIF search failed', error);
          setSearch((current) => ({ ...current, status: 'failed' }));
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, enabled]);

  return search;
}
