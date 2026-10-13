import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { communityQueryKeys } from '../../queryKeys';
import { leaveChannel, listChannelMembers } from '../api/channel-memberships-api';
import type { ChannelMembership } from '../types';

interface ChannelMembershipResult {
  query: UseQueryResult<ChannelMembership[]>;
  leave: UseMutationResult<void, Error, void>;
}

// Who is in the channel, and stepping out of it when the person was invited personally.
export function useChannelMembership(
  workspaceId: string,
  channelId: string | undefined,
): ChannelMembershipResult {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const membersKey = communityQueryKeys.members(identity, workspaceId, channelId);

  const query = useQuery({
    queryKey: membersKey,
    queryFn: () => listChannelMembers(token as string, workspaceId, channelId as string),
    enabled: Boolean(token && channelId),
  });

  const leave = useMutation({
    mutationFn: () => leaveChannel(token as string, workspaceId, channelId as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.channelLists(identity, workspaceId),
      });
      queryClient.removeQueries({
        queryKey: communityQueryKeys.channel(identity, workspaceId, channelId),
      });
    },
  });

  return { query, leave };
}
