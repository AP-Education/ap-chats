import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import type { WorkspaceUnread } from '../workspace-unread-context';
import { type ChannelUnread, workspaceUnreadQuery } from './useWorkspaceUnread';

function dataOf(results: UseQueryResult<ChannelUnread[]>[]) {
  return results.map((result) => result.data);
}

/** Every workspace's conversations at once, as WorkspaceUnreadSync keeps each of them live. */
export function useWorkspacesUnread(workspaceIds: string[]): WorkspaceUnread[] {
  const { token, identity } = useQueryAuth();
  const conversations = useQueries({
    queries: workspaceIds.map((workspaceId) => workspaceUnreadQuery(identity, token, workspaceId)),
    combine: dataOf,
  });

  return useMemo(
    () =>
      workspaceIds.map((workspaceId, index) => ({
        workspaceId,
        conversations: conversations[index],
      })),
    [workspaceIds, conversations],
  );
}
