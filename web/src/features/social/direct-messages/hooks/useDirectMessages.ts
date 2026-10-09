import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import {
  type DirectMessage,
  getDirectMessage,
  listDirectMessages,
} from '../api/direct-messages-api';
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

// A conversation opened from the list is already known: it renders at once instead of
// waiting on its own request before the history can even start.
export function useDirectMessage(workspaceId: string, channelId: string | undefined) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const listKey = directMessageKey(identity, workspaceId);

  return useQuery({
    queryKey: [...listKey, channelId],
    queryFn: () => getDirectMessage(token as string, workspaceId, channelId as string),
    enabled: Boolean(token && channelId),
    initialData: () =>
      queryClient
        .getQueryData<InfiniteData<{ items: DirectMessage[] }>>(listKey)
        ?.pages.flatMap((page) => page.items)
        .find((conversation) => conversation.id === channelId),
    initialDataUpdatedAt: () => queryClient.getQueryState(listKey)?.dataUpdatedAt,
  });
}
