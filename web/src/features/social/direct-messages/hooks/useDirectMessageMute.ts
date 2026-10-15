import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { updateDirectMessageMute } from '../api/direct-messages-api';
import { replaceDirectMessage } from '../cache';

export function useDirectMessageMute(workspaceId: string, channelId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mode: 'unmute' | 'hour' | 'day' | 'indefinite') => {
      if (!token) throw new Error('Not signed in');
      return updateDirectMessageMute(token, workspaceId, channelId, mode);
    },
    onSuccess: (updated) => replaceDirectMessage(queryClient, identity, updated),
  });
}
