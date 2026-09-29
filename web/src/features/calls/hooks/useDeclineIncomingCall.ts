import { useMutation } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { declineCall } from '../api/calls-api';
import { useCallStore } from '../store/call-store';

export function useDeclineIncomingCall() {
  const { token } = useQueryAuth();
  const clearIncoming = useCallStore((state) => state.clearIncoming);

  return useMutation({
    mutationFn: (call: { workspaceId: string; channelId: string; callId: string }) => {
      if (!token) throw new Error('Not signed in');
      return declineCall(token, call.workspaceId, call.channelId, call.callId);
    },
    onSuccess: (_result, call) => clearIncoming(call.callId),
  });
}
