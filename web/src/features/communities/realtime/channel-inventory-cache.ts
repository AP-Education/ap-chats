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

  // An initial list request can contain a snapshot from before creation. Cancel
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
