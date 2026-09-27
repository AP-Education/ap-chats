import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';

import { getDirectMessage, listDirectMessages } from '../api/direct-messages-api';

export const directMessageKey = (identity: string | undefined, workspaceId: string) =>
  ['direct-messages', identity, workspaceId] as const;

export function useDirectMessages(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  useSocketEvent('social:unread', (event) => {
    if (event.workspaceId === workspaceId)
      void queryClient.invalidateQueries({ queryKey: directMessageKey(identity, workspaceId) });
  });
  return useInfiniteQuery({
    queryKey: directMessageKey(identity, workspaceId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listDirectMessages(token as string, workspaceId, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(token),
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
