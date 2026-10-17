import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { getWorkspaceNotifications } from '../api/workspace-notifications-api';
import { nextSnoozeEnd, notifyByChannel } from '../notify-by-channel';
import { workspaceNotificationsKey } from '../queryKeys';

export function workspaceNotificationsQuery(
  identity: string | undefined,
  token: string | undefined,
  workspaceId: string,
) {
  return queryOptions({
    queryKey: workspaceNotificationsKey(identity, workspaceId),
    queryFn: () => getWorkspaceNotifications(token as string, workspaceId),
    enabled: Boolean(token),
    refetchOnWindowFocus: true,
    meta: { persist: true },
  });
}

/** What each conversation of a workspace tells the person about. */
export function useWorkspaceNotify(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const { data } = useQuery(workspaceNotificationsQuery(identity, token, workspaceId));

  return useMemo(() => data && notifyByChannel(data), [data]);
}

/** Asks a workspace again once a snooze in it runs out, so what it silenced speaks up on time. */
export function useSnoozeWakeUp(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery(workspaceNotificationsQuery(identity, token, workspaceId));
  useEffect(() => {
    const now = Date.now();
    const wakesAt = nextSnoozeEnd(data, now);
    if (wakesAt === null) return;

    const wake = setTimeout(
      () =>
        void queryClient.invalidateQueries({
          queryKey: workspaceNotificationsKey(identity, workspaceId),
        }),
      wakesAt - now,
    );
    return () => clearTimeout(wake);
  }, [data, queryClient, identity, workspaceId]);
}
