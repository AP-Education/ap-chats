import { useQueries, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';

import { notificationSettingsKey, workspaceNotificationsKey } from '../queryKeys';
import type { NotificationsServerToClientEvents, WorkspaceNotifications } from '../types';
import { workspaceNotificationsQuery } from './useWorkspaceNotifications';

function dataOf(results: UseQueryResult<WorkspaceNotifications>[]) {
  return results.map((result) => result.data);
}

/**
 * Conversations the person's workspaces keep silent. It arrives on its own and the unread counts
 * never wait for it; until it does, nothing reads as muted. Asked once a session, then kept current
 * by the person's changes on any device, by snoozes running out and by reconnects.
 */
export function useMutedConversations(workspaceIds: string[]): ReadonlySet<string> {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const { status } = useConnection();
  const hasConnected = useRef(false);

  const notifications = useQueries({
    queries: workspaceIds.map((workspaceId) => ({
      ...workspaceNotificationsQuery(identity, token, workspaceId),
      refetchOnMount: 'always' as const,
    })),
    combine: dataOf,
  });

  useSocketEvent<NotificationsServerToClientEvents>(
    'notifications:changed',
    ({ workspaceId, ...changed }) => {
      queryClient.setQueryData(workspaceNotificationsKey(identity, workspaceId), changed);
    },
  );

  useEffect(() => {
    if (status !== 'connected') return;
    if (hasConnected.current) {
      void queryClient.invalidateQueries({ queryKey: notificationSettingsKey(identity) });
    }
    hasConnected.current = true;
  }, [status, identity, queryClient]);

  useEffect(() => {
    const now = Date.now();
    const wakeUps = workspaceIds.flatMap((workspaceId, index) => {
      const changesAt = notifications[index]?.changesAt;
      const delay = changesAt ? Date.parse(changesAt) - now : 0;
      if (delay <= 0) return [];

      const askAgain = () =>
        void queryClient.invalidateQueries({
          queryKey: workspaceNotificationsKey(identity, workspaceId),
        });
      return [setTimeout(askAgain, delay)];
    });
    return () => wakeUps.forEach(clearTimeout);
  }, [workspaceIds, notifications, queryClient, identity]);

  return useMemo(
    () => new Set(notifications.flatMap((each) => each?.mutedChannelIds ?? [])),
    [notifications],
  );
}
