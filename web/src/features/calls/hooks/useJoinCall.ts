import { getAppShell } from '@ap-education/shell-sdk';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message as toast } from 'antd';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { joinCall } from '../api/calls-api';
import { requestNativeCallConnect } from '../api/native-call-bridge';
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
      // See useStartCall — RequireAuth guarantees this, just not in the type.
      if (!token) throw new Error('Not signed in');
      return joinCall(token, workspaceId, channelId, callId);
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
      console.error('[calls] failed to join call', error);
      toast.error('Не вдалося приєднатися до дзвінка. Спробуй ще раз.');
    },
  });
}
