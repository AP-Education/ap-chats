import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { apiRequest } from '@/shared/api/http';

import { applyReadState } from '../applyReadState';
import { applyUnreadMutation } from '../applyUnreadMutation';
import { unreadDirectMessagesKey, workspaceUnreadKey } from '../queryKeys';

export interface ChannelUnread {
  channelId: string;
  kind: 'public' | 'private' | 'dm';
  lastReadEntrySeq: string;
  unreadCount: number;
}

export function workspaceUnreadQuery(
  identity: string | undefined,
  token: string | undefined,
  workspaceId: string,
) {
  return queryOptions({
    queryKey: workspaceUnreadKey(identity, workspaceId),
    queryFn: () =>
      apiRequest<ChannelUnread[]>(`/api/workspaces/${workspaceId}/read-state`, token as string),
    enabled: Boolean(token),
    refetchOnWindowFocus: true,
    meta: { persist: true },
  });
}

export function useWorkspaceUnread(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const { status } = useConnection();
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const queryClient = useQueryClient();
  const seenEvents = useRef(new Set<string>());
  const connection = useRef({ workspaceId, identity, hasConnected: false });
  const queryKey = useMemo(
    () => workspaceUnreadKey(identity, workspaceId),
    [identity, workspaceId],
  );

  const query = useQuery(workspaceUnreadQuery(identity, token, workspaceId));

  useEffect(() => {
    if (
      connection.current.workspaceId !== workspaceId ||
      connection.current.identity !== identity
    ) {
      connection.current = { workspaceId, identity, hasConnected: false };
    }
    if (status !== 'connected') return;
    if (connection.current.hasConnected) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
      void queryClient.invalidateQueries({
        queryKey: unreadDirectMessagesKey(identity),
        exact: true,
      });
    }
    connection.current.hasConnected = true;
  }, [status, workspaceId, identity, queryClient, queryKey]);

  useSocketEvent('social:unread', (event) => {
    if (event.workspaceId !== workspaceId || seenEvents.current.has(event.eventId)) return;
    const snapshotWasFetching = queryClient.getQueryState(queryKey)?.fetchStatus === 'fetching';
    void queryClient.cancelQueries({ queryKey, exact: true });
    seenEvents.current.add(event.eventId);
    if (seenEvents.current.size > 1000) seenEvents.current.clear();
    const current = queryClient.getQueryData<ChannelUnread[]>(queryKey);
    if (!current || !currentMember || !current.some((item) => item.channelId === event.channelId)) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
      return;
    }
    queryClient.setQueryData<ChannelUnread[]>(
      queryKey,
      applyUnreadMutation(current, event, currentMember.id),
    );
    if (snapshotWasFetching) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
    }
  });

  useSocketEvent('social:read-state', (event) => {
    if (event.workspaceId !== workspaceId) return;
    applyReadState(queryClient, identity, workspaceId, event.channelId, event);
  });

  return query;
}
