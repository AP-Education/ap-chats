import { useInfiniteQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { listCallHistory } from '../api/calls-api';
import type { CallHistoryFilter } from '../types';

export function callHistoryKey(identity: string | undefined) {
  return ['calls', 'history', identity] as const;
}

export function useCallHistory(filter: CallHistoryFilter) {
  const { token, identity } = useQueryAuth();

  return useInfiniteQuery({
    // Under the shared prefix, so one invalidation refreshes every filter's list.
    queryKey: [...callHistoryKey(identity), filter],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listCallHistory(token as string, filter, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(token),
  });
}
