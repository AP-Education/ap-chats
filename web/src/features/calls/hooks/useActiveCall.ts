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
  });
}
