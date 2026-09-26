import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/stores/current-user-context';

import { type ChannelScope, getChannel, listChannels } from '../api/channels-api';
import type { Channel } from '../types';

// All public channels plus every channel the workspace member has joined —
// enough to derive both "my channels" and "channels I could join" for the
// sidebar without a second request.
export function useChannels(
  workspaceId: string | undefined,
  scope: ChannelScope = 'available',
): UseQueryResult<Channel[]> {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;

  return useQuery({
    queryKey: ['channels', workspaceId, scope, token],
    queryFn: () => listChannels(token as string, workspaceId as string, scope),
    enabled: Boolean(token && workspaceId),
  });
}

export function useChannel(
  workspaceId: string | undefined,
  channelId: string | undefined,
): UseQueryResult<Channel> {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;

  return useQuery({
    queryKey: ['channel', workspaceId, channelId, token],
    queryFn: () => getChannel(token as string, workspaceId as string, channelId as string),
    enabled: Boolean(token && workspaceId && channelId),
  });
}
