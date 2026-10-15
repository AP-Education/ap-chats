import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { communityQueryKeys } from '../../queryKeys';
import { listChannelMembers } from '../api/channel-memberships-api';
import type { ChannelMembership } from '../types';

// Who is in the channel; the channel's access lists alone decide it.
export function useChannelMembership(
  workspaceId: string,
  channelId: string | undefined,
): { query: UseQueryResult<ChannelMembership[]> } {
  const { token, identity } = useQueryAuth();

  const query = useQuery({
    queryKey: communityQueryKeys.members(identity, workspaceId, channelId),
    queryFn: () => listChannelMembers(token as string, workspaceId, channelId as string),
    enabled: Boolean(token && channelId),
  });

  return { query };
}
