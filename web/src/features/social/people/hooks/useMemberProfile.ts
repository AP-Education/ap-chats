import { useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { getMemberProfile } from '../api/member-profile-api';
import { peopleQueryKeys } from '../queryKeys';

export function useMemberProfile(workspaceId: string | undefined, memberId: string) {
  const { token, identity } = useQueryAuth();

  return useQuery({
    queryKey: peopleQueryKeys.profile(identity, workspaceId, memberId),
    queryFn: () => getMemberProfile(token as string, workspaceId as string, memberId),
    enabled: Boolean(token && workspaceId),
    refetchOnMount: 'always',
  });
}
