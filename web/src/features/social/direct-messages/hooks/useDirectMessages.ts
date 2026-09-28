import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';

import { getDirectMessage, listDirectMessages } from '../api/direct-messages-api';
import { mergeDirectMessage } from '../cache';
import { directMessageKey } from '../queryKeys';

export function useDirectMessages(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  useSocketEvent('social:unread', (event) => {
    if (event.workspaceId !== workspaceId || !token) return;
    const key = directMessageKey(identity, workspaceId);
    const known = queryClient.getQueryData([...key, event.channelId]);
    if (!known) {
      void queryClient.invalidateQueries({ queryKey: key, exact: true });
      return;
    }
    void getDirectMessage(token, workspaceId, event.channelId).then(
      (updated) => mergeDirectMessage(queryClient, identity, workspaceId, updated),
      () => void queryClient.invalidateQueries({ queryKey: key, exact: true }),
    );
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
