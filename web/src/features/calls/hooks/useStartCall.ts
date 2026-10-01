import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message as toast } from 'antd';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { getAppShell } from '@/lib/app-shell';

import { joinCall, startCall } from '../api/calls-api';
import { requestNativeCallConnect } from '../api/native-call-bridge';
import { useCallStore } from '../store/call-store';
import { activeCallQueryKey } from './useActiveCall';

/** Starts a call and joins it immediately: the caller is the first participant, others ring in. */
export function useStartCall(
  workspaceId: string,
  channelId: string,
  title: string,
  calleeAvatarPath?: string | null,
) {
  const { token } = useQueryAuth();
  const setActive = useCallStore((state) => state.setActive);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // RequireAuth never renders this button before status is 'signed-in',
      // and that variant's accessToken isn't optional — this is a type
      // narrowing, not a real runtime path.
      if (!token) throw new Error('Not signed in');
      const call = await startCall(token, workspaceId, channelId);
      const grant = await joinCall(token, workspaceId, channelId, call.id);
      return grant;
    },
    onSuccess: (grant) => {
      // The native shell connects the LiveKit room and owns the in-call screen
      // itself on mobile — see NativeCallConnectPayload.
      if (getAppShell().kind === 'mobile') {
        requestNativeCallConnect({ workspaceId, channelId, title, calleeAvatarPath, grant });
      } else {
        setActive({ ...grant, workspaceId, channelId, title, calleeAvatarPath });
      }
      queryClient.invalidateQueries({ queryKey: activeCallQueryKey(workspaceId, channelId) });
    },
    onError: (error) => {
      console.error('[calls] failed to start call', error);
      toast.error('Не вдалося подзвонити. Спробуй ще раз.');
    },
  });
}
