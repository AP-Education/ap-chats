import type { QueryClient } from '@tanstack/react-query';

import { messagingQueryKeys } from '../messaging/queryKeys';
import type { ChatTimelineData } from '../messaging/timeline/chat-entry';
import type { ReadState } from '../messaging/types';
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

// A cursor gone back replaces what the caches hold rather than losing to it; history is fetched
// again so its unread stretch opens where it now starts.
export function applyRewoundReadState(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
  state: ReadState,
): void {
  queryClient.setQueryData<ChannelUnread[]>(workspaceUnreadKey(identity, workspaceId), (current) =>
    current?.map((entry) => (entry.channelId === channelId ? { ...entry, ...state } : entry)),
  );
  void queryClient.invalidateQueries({ queryKey: unreadDirectMessagesKey(identity), exact: true });
  void queryClient.invalidateQueries({
    queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId),
  });
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
    queryClient.setQueryData<Array<{ id: string }>>(unreadDirectMessagesKey(identity), (current) =>
      current?.filter((entry) => entry.id !== channelId),
    );
  }
  queryClient.setQueriesData<ChatTimelineData>(
    { queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId) },
    (current) => {
      const known = current?.meta?.readState;
      const isBehind = known && BigInt(state.lastReadEntrySeq) < BigInt(known.lastReadEntrySeq);
      if (!current?.meta || isBehind) return current;
      return {
        ...current,
        meta: { ...current.meta, unreadCount: state.unreadCount, readState: state },
      };
    },
  );
}
