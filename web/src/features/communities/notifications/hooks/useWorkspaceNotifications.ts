import { queryOptions } from '@tanstack/react-query';

import { getWorkspaceNotifications } from '../api/workspace-notifications-api';
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
