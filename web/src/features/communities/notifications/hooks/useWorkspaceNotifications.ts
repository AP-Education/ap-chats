import { queryOptions, useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { getWorkspaceNotifications } from '../api/workspace-notifications-api';
import { workspaceNotificationsKey } from '../queryKeys';

// Never stale on its own: useMutedConversations keeps it current from events, snoozes and reconnects.
export function workspaceNotificationsQuery(
  identity: string | undefined,
  token: string | undefined,
  workspaceId: string,
) {
  return queryOptions({
    queryKey: workspaceNotificationsKey(identity, workspaceId),
    queryFn: () => getWorkspaceNotifications(token as string, workspaceId),
    enabled: Boolean(token),
    staleTime: Infinity,
    meta: { persist: true },
  });
}

/** The person's choice for a workspace, and what it leaves silent there. */
export function useWorkspaceNotifications(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  return useQuery(workspaceNotificationsQuery(identity, token, workspaceId));
}
