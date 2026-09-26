import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { communityQueryKeys } from '../../queryKeys';
import { type ChannelScope, getChannel, listChannels } from '../api/channels-api';
import type { Channel } from '../types';

// All public channels plus every channel the workspace member has joined —
// enough to derive both "my channels" and "channels I could join" for the
// sidebar without a second request.
export function useChannels(
  workspaceId: string | undefined,
  scope: ChannelScope = 'available',
): UseQueryResult<Channel[]> {
  const { token, identity } = useQueryAuth();

  return useQuery({
    queryKey: communityQueryKeys.channels(identity, workspaceId, scope),
    queryFn: () => listChannels(token as string, workspaceId as string, scope),
    enabled: Boolean(token && workspaceId),
  });
}

export function useChannel(
  workspaceId: string | undefined,
  channelId: string | undefined,
): UseQueryResult<Channel> {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: communityQueryKeys.channel(identity, workspaceId, channelId),
    queryFn: () => getChannel(token as string, workspaceId as string, channelId as string),
    enabled: Boolean(token && workspaceId && channelId),
    initialData: () =>
      queryClient
        .getQueryData<Channel[]>(communityQueryKeys.channels(identity, workspaceId, 'available'))
        ?.find((channel) => channel.id === channelId),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(communityQueryKeys.channels(identity, workspaceId, 'available'))
        ?.dataUpdatedAt,
  });
}
