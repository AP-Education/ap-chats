import { useQueryClient } from '@tanstack/react-query';

import { useRoleChanges } from '@/features/roles/hooks/useRoleChanges';

import { peopleQueryKeys } from '../queryKeys';

/** A profile lists the person's roles by name and colour, so profiles follow role changes. */
export function useProfilesFollowRoles(): void {
  const queryClient = useQueryClient();

  useRoleChanges(({ identity, workspaceId }) => {
    void queryClient.invalidateQueries({
      queryKey: peopleQueryKeys.profiles(identity, workspaceId),
    });
  });
}
