import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import type { ChannelUnread } from '@/features/social/read-state/hooks/useWorkspaceUnread';
import {
  unreadDirectMessagesKey,
  workspaceUnreadKey,
} from '@/features/social/read-state/queryKeys';

import {
  getDirectMessage,
  listUnreadDirectMessages,
  type UnreadDirectMessage,
} from '../api/direct-messages-api';
import { mergeDirectMessage } from '../cache';

// Only called from WorkspaceUnreadScope; no polling interval, same reasoning as useWorkspaceUnread.
export function useUnreadDirectMessages(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = unreadDirectMessagesKey(identity, workspaceId);
  const pendingRequests = useRef(new Map<string, string>());

  useSocketEvent('social:unread', (event) => {
    if (event.workspaceId !== workspaceId || event.kind !== 'dm' || event.subject !== 'message')
      return;
    const snapshotWasFetching = queryClient.getQueryState(queryKey)?.fetchStatus === 'fetching';
    void queryClient.cancelQueries({ queryKey, exact: true });
    if (snapshotWasFetching || !queryClient.getQueryData(queryKey)) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
    }
    pendingRequests.current.set(event.channelId, event.eventId);
    const unreadCount = queryClient
      .getQueryData<ChannelUnread[]>(workspaceUnreadKey(identity, workspaceId))
      ?.find((channel) => channel.channelId === event.channelId)?.unreadCount;
    if (unreadCount === undefined) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
    }
    if (unreadCount === 0) {
      queryClient.setQueryData<UnreadDirectMessage[]>(queryKey, (current) =>
        current?.filter((item) => item.id !== event.channelId),
      );
      void queryClient.invalidateQueries({ queryKey, exact: true });
    }
    if (!token) return;
    void getDirectMessage(token, workspaceId, event.channelId).then(
      (updated) => {
        if (pendingRequests.current.get(event.channelId) !== event.eventId) return;
        pendingRequests.current.delete(event.channelId);
        mergeDirectMessage(queryClient, identity, workspaceId, updated);
        queryClient.setQueryData<UnreadDirectMessage[]>(queryKey, (current) => {
          if (!current) return current;
          const latestCount = queryClient
            .getQueryData<ChannelUnread[]>(workspaceUnreadKey(identity, workspaceId))
            ?.find((channel) => channel.channelId === event.channelId)?.unreadCount;
          if (latestCount === undefined) return current;
          if (!latestCount) return current.filter((item) => item.id !== event.channelId);
          return [
            { ...updated, unreadCount: latestCount },
            ...current.filter((item) => item.id !== event.channelId),
          ]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, 5);
        });
      },
      () => {
        if (pendingRequests.current.get(event.channelId) !== event.eventId) return;
        pendingRequests.current.delete(event.channelId);
        void queryClient.invalidateQueries({ queryKey, exact: true });
      },
    );
  });

  return useQuery({
    queryKey,
    queryFn: () => listUnreadDirectMessages(token as string, workspaceId),
    enabled: Boolean(token),
    refetchOnWindowFocus: true,
  });
}
