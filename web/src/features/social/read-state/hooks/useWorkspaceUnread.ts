import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';
import { apiRequest } from '@/shared/api/http';

import { workspaceUnreadKey } from '../queryKeys';

export interface ChannelUnread {
  channelId: string;
  lastReadEntrySeq: string;
  unreadCount: number;
}

export function useWorkspaceUnread(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const { socket, status } = useConnection();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => workspaceUnreadKey(identity, workspaceId),
    [identity, workspaceId],
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<ChannelUnread[]>(`/api/workspaces/${workspaceId}/read-state`, token as string),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!socket || status !== 'connected') return;
    socket.emit('social:watch-workspace', { workspaceId });
    void queryClient.invalidateQueries({ queryKey, exact: true });
    return () => {
      socket.emit('social:unwatch-workspace', { workspaceId });
    };
  }, [socket, status, workspaceId, queryClient, queryKey]);

  useSocketEvent('social:unread', (event) => {
    if (event.workspaceId === workspaceId)
      void queryClient.invalidateQueries({ queryKey, exact: true });
  });

  return query;
}
