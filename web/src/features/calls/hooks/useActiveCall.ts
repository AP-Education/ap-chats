import { useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { getActiveCall } from '../api/calls-api';

export function activeCallQueryKey(workspaceId: string, channelId: string) {
  return ['calls', 'active', workspaceId, channelId] as const;
}

export function useActiveCall(workspaceId: string, channelId: string) {
  const { token } = useQueryAuth();

  return useQuery({
    queryKey: activeCallQueryKey(workspaceId, channelId),
    queryFn: () => getActiveCall(token!, workspaceId, channelId),
    enabled: Boolean(token),
    staleTime: 10_000,
    // The server only sweeps a ringing call to "missed" when something asks
    // for it again — nothing pushes that on a timer. Polling while ringing
    // is what actually makes the 45s ring TTL take effect for whoever's
    // watching it (the caller's own waiting screen, everyone else's banner);
    // once it's answered, ended, or there's no call, this goes back to idle.
    refetchInterval: (query) => (query.state.data?.status === 'ringing' ? 5000 : false),
  });
}
