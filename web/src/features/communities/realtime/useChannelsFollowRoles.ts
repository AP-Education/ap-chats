import { useQueryClient } from '@tanstack/react-query';

import { useRoleChanges } from '@/features/roles/hooks/useRoleChanges';

import { communityQueryKeys } from '../queryKeys';

/** Roles group and colour channel members and open channels, so both lists follow role changes. */
export function useChannelsFollowRoles(): void {
  const queryClient = useQueryClient();

  useRoleChanges(({ identity, workspaceId }) => {
    void queryClient.invalidateQueries({
      queryKey: communityQueryKeys.memberLists(identity, workspaceId),
    });
    void queryClient.invalidateQueries({
      queryKey: communityQueryKeys.channelLists(identity, workspaceId),
    });
  });
}
