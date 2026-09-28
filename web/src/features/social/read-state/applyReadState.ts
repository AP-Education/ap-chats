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
) {
  queryClient.setQueryData<ChannelUnread[]>(workspaceUnreadKey(identity, workspaceId), (current) =>
    current?.map((entry) =>
      entry.channelId === channelId &&
      BigInt(state.lastReadEntrySeq) >= BigInt(entry.lastReadEntrySeq)
        ? { ...entry, ...state }
        : entry,
    ),
  );
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
        pages: current.pages.map((page) => ({
          ...page,
          unreadCount: state.unreadCount,
          firstUnreadSeq: state.unreadCount === 0 ? null : page.firstUnreadSeq,
          readState: state,
        })),
      },
  );
}
