import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { getDirectMessage, listDirectMessages } from '../api/direct-messages-api';
import { directMessageKey } from '../queryKeys';

export function useDirectMessages(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  return useInfiniteQuery({
    queryKey: directMessageKey(identity, workspaceId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listDirectMessages(token as string, workspaceId, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(token),
    meta: { persist: true },
  });
}

export function useDirectMessage(workspaceId: string, channelId: string | undefined) {
  const { token, identity } = useQueryAuth();
  return useQuery({
    queryKey: [...directMessageKey(identity, workspaceId), channelId],
    queryFn: () => getDirectMessage(token as string, workspaceId, channelId as string),
    enabled: Boolean(token && channelId),
  });
}
