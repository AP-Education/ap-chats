import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { joinCall } from '../api/calls-api';
import { useCallStore } from '../store/call-store';
import { activeCallQueryKey } from './useActiveCall';

/** Joins a call that already exists, whether an incoming ring or an ongoing channel call. */
export function useJoinCall(
  workspaceId: string,
  channelId: string,
  title: string,
  calleeAvatarPath?: string | null,
) {
  const { token } = useQueryAuth();
  const setActive = useCallStore((state) => state.setActive);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) => {
      if (!token) throw new Error('Not signed in');
      return joinCall(token, workspaceId, channelId, callId);
    },
    onSuccess: (grant) => {
      setActive({ ...grant, workspaceId, channelId, title, calleeAvatarPath });
      queryClient.invalidateQueries({ queryKey: activeCallQueryKey(workspaceId, channelId) });
    },
  });
}
