import { useInfiniteQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { listCallHistory } from '../api/calls-api';
import type { CallHistoryFilter } from '../types';

export function callHistoryKey(identity: string | undefined, workspaceId: string) {
  return ['calls', 'history', identity, workspaceId] as const;
}

export function useCallHistory(workspaceId: string, filter: CallHistoryFilter) {
  const { token, identity } = useQueryAuth();

  return useInfiniteQuery({
    // Under the shared prefix, so one invalidation refreshes every filter's list.
    queryKey: [...callHistoryKey(identity, workspaceId), filter],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listCallHistory(token as string, workspaceId, filter, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(token),
  });
}
