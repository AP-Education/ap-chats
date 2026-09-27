import { useInfiniteQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { historyPage, openHistory } from '../api/messages-api';
import { messagingQueryKeys } from '../queryKeys';

export type PageCursor =
  | { mode: 'window'; messageId?: string }
  | { mode: 'before' | 'after'; cursor: string; snapshot: string };

export function useMessageHistory(workspaceId: string, channelId: string, messageId?: string) {
  const { token, identity } = useQueryAuth();

  return useInfiniteQuery({
    queryKey: messagingQueryKeys.history(identity, workspaceId, channelId, messageId),
    initialPageParam: { mode: 'window', messageId } as PageCursor,
    queryFn: ({ pageParam }) => {
      if (!token) throw new Error('Not signed in');
      if (pageParam.mode === 'window')
        return openHistory(token, workspaceId, channelId, pageParam.messageId);
      return historyPage(
        token,
        workspaceId,
        channelId,
        pageParam.mode,
        pageParam.cursor,
        pageParam.snapshot,
      );
    },
    getPreviousPageParam: (firstPage): PageCursor | undefined =>
      firstPage.hasOlder && firstPage.olderCursor
        ? { mode: 'before', cursor: firstPage.olderCursor, snapshot: firstPage.snapshotSeq }
        : undefined,
    getNextPageParam: (lastPage): PageCursor | undefined =>
      lastPage.hasNewer && lastPage.newerCursor
        ? { mode: 'after', cursor: lastPage.newerCursor, snapshot: lastPage.snapshotSeq }
        : undefined,
    enabled: Boolean(token),
    refetchOnWindowFocus: false,
  });
}
