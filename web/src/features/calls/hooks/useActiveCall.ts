import { useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { type CallView, getActiveCall } from '../api/calls-api';

export function activeCallQueryKey(workspaceId: string, channelId: string) {
  return ['calls', 'active', workspaceId, channelId] as const;
}

function useActiveCallQuery(workspaceId: string, channelId: string, readOnMount: boolean) {
  const { token } = useQueryAuth();

  return useQuery({
    queryKey: activeCallQueryKey(workspaceId, channelId),
    queryFn: () => getActiveCall(token!, workspaceId, channelId),
    enabled: Boolean(token),
    staleTime: 10_000,
    refetchOnMount: readOnMount ? 'always' : true,
    // The server only sweeps a ringing call to "missed" when something asks
    // for it again — nothing pushes that on a timer. Polling while ringing
    // is what actually makes the 45s ring TTL take effect for whoever's
    // watching it (the caller's own waiting screen, everyone else's banner);
    // once it's answered, ended, or there's no call, this goes back to idle.
    refetchInterval: (query) => (query.state.data?.status === 'ringing' ? 5000 : false),
  });
}

export function useActiveCall(workspaceId: string, channelId: string) {
  return useActiveCallQuery(workspaceId, channelId, false);
}

/**
 * The channel's live call as read since the caller mounted, `undefined` until then: whether a call
 * still rings is never judged by an answer cached from before.
 */
export function useFreshActiveCall(
  workspaceId: string,
  channelId: string,
): CallView | null | undefined {
  const live = useActiveCallQuery(workspaceId, channelId, true);
  return live.isFetchedAfterMount ? live.data : undefined;
}
