import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { messagingQueryKeys } from '@/features/social/messaging/queryKeys';

import { listPins, setPin } from '../api/pins-api';

export function usePins(workspaceId: string, channelId: string) {
  const { token, identity } = useQueryAuth();
  const key = ['pins', identity, workspaceId, channelId] as const;
  return useQuery({
    queryKey: key,
    queryFn: () => listPins(token as string, workspaceId, channelId),
    enabled: Boolean(token),
  });
}

export function usePinActions(workspaceId: string, channelId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const key = ['pins', identity, workspaceId, channelId] as const;
  async function update(messageId: string, active: boolean) {
    if (!token) throw new Error('Not signed in');
    await setPin(token, workspaceId, channelId, messageId, active);
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.channel(identity, workspaceId, channelId),
    });
  }

  return { update };
}
