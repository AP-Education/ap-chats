import { useQueries, type UseQueryResult } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { type ChannelUnread, workspaceUnreadQuery } from './useWorkspaceUnread';

function combineSummaries(results: UseQueryResult<ChannelUnread[]>[]) {
  return results.flatMap((result) => result.data ?? []).filter((channel) => channel.kind === 'dm');
}

/** Unread direct conversations of the other workspaces, kept live by WorkspaceUnreadSync. */
export function useDirectUnreadElsewhere(workspaceIds: string[]) {
  const { token, identity } = useQueryAuth();

  return useQueries({
    queries: workspaceIds.map((workspaceId) => workspaceUnreadQuery(identity, token, workspaceId)),
    combine: combineSummaries,
  });
}
