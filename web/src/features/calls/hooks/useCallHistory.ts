import { useInfiniteQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { listCallHistory } from '../api/calls-api';

export function callHistoryKey(identity: string | undefined, workspaceId: string) {
  return ['calls', 'history', identity, workspaceId] as const;
}

export function useCallHistory(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  return useInfiniteQuery({
    queryKey: callHistoryKey(identity, workspaceId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listCallHistory(token as string, workspaceId, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(token),
  });
}
