import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { PageCursor } from '../messaging/hooks/useMessageHistory';
import { messagingQueryKeys } from '../messaging/queryKeys';
import type { HistoryPage, ReadState } from '../messaging/types';
import type { ChannelUnread } from './hooks/useWorkspaceUnread';
import { unreadDirectMessagesKey, workspaceUnreadKey } from './queryKeys';

export function applyReadState(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
  state: ReadState,
): void {
  writeReadState(queryClient, identity, workspaceId, channelId, state, true);
}

export function applyOptimisticReadState(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
  state: ReadState,
): void {
  writeReadState(queryClient, identity, workspaceId, channelId, state, false);
}

function writeReadState(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
  state: ReadState,
  reconcile: boolean,
): void {
  const summaryKey = workspaceUnreadKey(identity, workspaceId);
  const snapshotWasFetching = queryClient.getQueryState(summaryKey)?.fetchStatus === 'fetching';
  void queryClient.cancelQueries({ queryKey: summaryKey, exact: true });
  const hasSnapshot = Boolean(queryClient.getQueryData(summaryKey));
  queryClient.setQueryData<ChannelUnread[]>(summaryKey, (current) =>
    current?.map((entry) =>
      entry.channelId === channelId &&
      BigInt(state.lastReadEntrySeq) >= BigInt(entry.lastReadEntrySeq)
        ? { ...entry, ...state }
        : entry,
    ),
  );
  if (reconcile && (!hasSnapshot || snapshotWasFetching)) {
    void queryClient.invalidateQueries({ queryKey: summaryKey, exact: true });
  }
  if (state.unreadCount === 0) {
    queryClient.setQueryData<Array<{ id: string }>>(
      unreadDirectMessagesKey(identity, workspaceId),
      (current) => current?.filter((entry) => entry.id !== channelId),
    );
  }
  queryClient.setQueriesData<InfiniteData<HistoryPage, PageCursor>>(
    { queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId) },
    (current) =>
      current && {
        ...current,
        pages: current.pages.map((page) => {
          if (
            page.readState &&
            BigInt(state.lastReadEntrySeq) < BigInt(page.readState.lastReadEntrySeq)
          )
            return page;
          return {
            ...page,
            unreadCount: state.unreadCount,
            readState: state,
          };
        }),
      },
  );
}
