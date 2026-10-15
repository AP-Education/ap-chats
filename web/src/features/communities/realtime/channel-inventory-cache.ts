import type { QueryClient } from '@tanstack/react-query';

import { communityQueryKeys } from '../queryKeys';

export async function refreshChannelInventory(
  queryClient: QueryClient,
  identity: string,
  workspaceId?: string,
): Promise<void> {
  const channels = workspaceId
    ? communityQueryKeys.channelLists(identity, workspaceId)
    : ['channels', identity];
  const categories = workspaceId
    ? communityQueryKeys.categories(identity, workspaceId)
    : ['channel-categories', identity];

  // An initial list request can contain a snapshot from before the change. Cancel
  // it too, so it cannot finish after the event and overwrite the fresh list.
  await Promise.all([
    queryClient.cancelQueries({ queryKey: channels }),
    queryClient.cancelQueries({ queryKey: categories }),
  ]);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: channels }),
    queryClient.invalidateQueries({ queryKey: categories }),
  ]);
}

/**
 * What someone may do in channels they keep has changed. Only open channels refetch now;
 * the list is refreshed on its next use, so a change for a whole company sends no burst.
 */
export async function refreshChannelRights(
  queryClient: QueryClient,
  identity: string,
  workspaceId: string,
  channelId?: string,
): Promise<void> {
  const details = channelId
    ? communityQueryKeys.channel(identity, workspaceId, channelId)
    : communityQueryKeys.channelDetails(identity, workspaceId);

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: details }),
    queryClient.invalidateQueries({
      queryKey: communityQueryKeys.channelLists(identity, workspaceId),
      refetchType: 'none',
    }),
  ]);
}
