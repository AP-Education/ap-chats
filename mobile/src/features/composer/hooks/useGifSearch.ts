import { useCallback, useEffect, useRef, useState } from 'react';

import { searchGifs } from '../api/gif-provider';
import type { GifResult } from '../types';

const SEARCH_DEBOUNCE_MS = 350;

interface GifSearchState {
  status: 'loading' | 'ready' | 'error';
  gifs: GifResult[];
  nextPage: number | null;
}

/** KLIPY results for a query, a page at a time as the list nears its end. */
export function useGifSearch(query: string, enabled: boolean) {
  const [search, setSearch] = useState<GifSearchState>({
    status: 'loading',
    gifs: [],
    nextPage: null,
  });
  const loadingMore = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      loadingMore.current?.abort();
      setSearch((current) => ({ ...current, status: 'loading' }));
      searchGifs(query, 1, controller.signal)
        .then(({ gifs, nextPage }) => setSearch({ status: 'ready', gifs, nextPage }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error('GIF search failed', error);
          setSearch((current) => ({ ...current, status: 'error' }));
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, enabled]);

  const loadMore = useCallback(() => {
    const page = search.nextPage;
    if (page === null || search.status !== 'ready' || loadingMore.current) return;

    const controller = new AbortController();
    loadingMore.current = controller;
    searchGifs(query, page, controller.signal)
      .then(({ gifs, nextPage }) =>
        setSearch((current) => ({ ...current, gifs: [...current.gifs, ...gifs], nextPage })),
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error('More GIFs failed to load', error);
      })
      .finally(() => {
        if (loadingMore.current === controller) loadingMore.current = null;
      });
  }, [query, search.nextPage, search.status]);

  return { ...search, loadMore };
}
