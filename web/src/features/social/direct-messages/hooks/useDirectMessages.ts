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

export function useDirectMessages() {
  const { token, identity } = useQueryAuth();
  return useInfiniteQuery({
    queryKey: directMessageKey(identity),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listDirectMessages(token as string, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(token),
    meta: { persist: true },
  });
}

// A conversation opened from the list is already known: it renders at once instead of
// waiting on its own request before the history can even start.
export function useDirectMessage(channelId: string | undefined) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const listKey = directMessageKey(identity);

  return useQuery({
    queryKey: [...listKey, channelId],
    queryFn: () => getDirectMessage(token as string, channelId as string),
    enabled: Boolean(token && channelId),
    initialData: () =>
      queryClient
        .getQueryData<InfiniteData<{ items: DirectMessage[] }>>(listKey)
        ?.pages.flatMap((page) => page.items)
        .find((conversation) => conversation.id === channelId),
    initialDataUpdatedAt: () => queryClient.getQueryState(listKey)?.dataUpdatedAt,
  });
}
