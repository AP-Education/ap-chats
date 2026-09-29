import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { leaveCall } from '../api/calls-api';
import { useCallStore } from '../store/call-store';
import { activeCallQueryKey } from './useActiveCall';

/**
 * Disconnects from the call room. The call itself only ends once the server
 * confirms nobody is left in it, so leaving while others remain never cuts
 * their call short.
 */
export function useLeaveActiveCall() {
  const { token } = useQueryAuth();
  const active = useCallStore((state) => state.active);
  const clearActive = useCallStore((state) => state.clearActive);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!token || !active) throw new Error('No active call');
      return leaveCall(token, active.workspaceId, active.channelId, active.callId);
    },
    onSuccess: () => {
      if (active) {
        queryClient.invalidateQueries({
          queryKey: activeCallQueryKey(active.workspaceId, active.channelId),
        });
      }
      clearActive();
    },
  });
}
