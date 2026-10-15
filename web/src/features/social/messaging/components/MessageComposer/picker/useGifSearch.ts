import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

import { searchGifs } from '../../../gifs/klipy-api';
import type { Gif } from '../../../gifs/types';
import { messagingQueryKeys } from '../../../queryKeys';

const SEARCH_DEBOUNCE_MS = 350;

export interface GifSearch {
  status: 'searching' | 'failed' | 'ready';
  gifs: Gif[];
  hasMore: boolean;
  loadMore: () => void;
}

export function useGifSearch(query: string, enabled: boolean): GifSearch {
  const settledQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const search = useInfiniteQuery({
    queryKey: messagingQueryKeys.gifSearch(settledQuery),
    queryFn: ({ pageParam, signal }) => searchGifs(settledQuery, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (page) => page.nextPage,
    enabled,
    // Earlier results stay on screen while the next query runs.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const { isFetchingNextPage, fetchNextPage } = search;
  const loadMore = useCallback(() => {
    if (!isFetchingNextPage) void fetchNextPage();
  }, [isFetchingNextPage, fetchNextPage]);

  const status = search.isError ? 'failed' : search.isPending ? 'searching' : 'ready';
  const gifs = search.data?.pages.flatMap((page) => page.gifs) ?? [];

  return { status, gifs, hasMore: search.hasNextPage, loadMore };
}
