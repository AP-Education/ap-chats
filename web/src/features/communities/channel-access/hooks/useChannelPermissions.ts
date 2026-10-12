import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { communityQueryKeys } from '../../queryKeys';
import { changeChannelPermissions, getChannelPermissions } from '../api/channel-permissions-api';
import type { ChannelPermissions, ChannelPermissionsInput } from '../types';

interface ChannelPermissionsResult {
  query: UseQueryResult<ChannelPermissions>;
  change: UseMutationResult<ChannelPermissions, Error, ChannelPermissionsInput>;
}

export function useChannelPermissions(
  workspaceId: string,
  channelId: string,
  enabled = true,
): ChannelPermissionsResult {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const permissionsKey = communityQueryKeys.permissions(identity, workspaceId, channelId);

  const query = useQuery({
    queryKey: permissionsKey,
    queryFn: () => getChannelPermissions(token as string, workspaceId, channelId),
    enabled: Boolean(token) && enabled,
  });

  const change = useMutation({
    mutationFn: (input: ChannelPermissionsInput) =>
      changeChannelPermissions(token as string, workspaceId, channelId, input),
    onSuccess: (permissions) => {
      queryClient.setQueryData(permissionsKey, permissions);
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.channelLists(identity, workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.channel(identity, workspaceId, channelId),
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.members(identity, workspaceId, channelId),
      });
    },
  });

  return { query, change };
}
