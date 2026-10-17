import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { workspaceNotificationsQuery } from '@/features/communities/notifications/hooks/useWorkspaceNotifications';
import { notifyByChannel } from '@/features/communities/notifications/notify-by-channel';

import type { WorkspaceReadState } from '../workspace-unread-context';
import { workspaceUnreadQuery } from './useWorkspaceUnread';

function dataOf<T>(results: UseQueryResult<T>[]): Array<T | undefined> {
  return results.map((result) => result.data);
}

/** The other workspaces' conversations, kept live by WorkspaceUnreadSync. */
export function useWorkspacesReadState(workspaceIds: string[]): WorkspaceReadState[] {
  const { token, identity } = useQueryAuth();
  const conversations = useQueries({
    queries: workspaceIds.map((workspaceId) => workspaceUnreadQuery(identity, token, workspaceId)),
    combine: dataOf,
  });
  const notifications = useQueries({
    queries: workspaceIds.map((workspaceId) =>
      workspaceNotificationsQuery(identity, token, workspaceId),
    ),
    combine: dataOf,
  });

  return useMemo(
    () =>
      conversations.map((summary, index) => {
        const described = notifications[index];
        return {
          conversations: summary,
          notifyByChannel: described && notifyByChannel(described),
        };
      }),
    [conversations, notifications],
  );
}
