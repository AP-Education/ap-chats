import { useQueries } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { listChannels } from '@/features/communities/channels/api/channels-api';
import { communityQueryKeys } from '@/features/communities/queryKeys';
import { useDirectMessages } from '@/features/social/direct-messages/hooks/useDirectMessages';
import { useWorkspaces } from '@/features/workspaces/hooks/useWorkspaces';

import { shareTargets, type WorkspaceChannels } from '../share-targets';

/** Every conversation the person can share into, from the same caches as their lists. */
export function useShareTargets() {
  const { token, identity } = useQueryAuth();
  const directs = useDirectMessages();
  const workspaces = useWorkspaces();
  const channelLists = useQueries({
    queries: (workspaces.data ?? []).map((workspace) => ({
      queryKey: communityQueryKeys.channels(identity, workspace.id, 'mine'),
      queryFn: () => listChannels(token as string, workspace.id),
      enabled: Boolean(token),
      meta: { persist: true },
    })),
  });

  const channels = (workspaces.data ?? []).map((workspace, index): WorkspaceChannels => ({
    workspace,
    channels: channelLists[index]?.data ?? [],
  }));
  const people = directs.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    targets: shareTargets(people, channels),
    isLoading:
      directs.isPending || workspaces.isPending || channelLists.some((list) => list.isPending),
  };
}
