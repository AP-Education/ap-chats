import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { markUnread } from '../api/read-state-api';
import { applyRewoundReadState } from '../applyReadState';
import { useReadingHold } from '../stores/reading-hold-store';

export function useMarkUnread(workspaceId: string, channelId: string) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const hold = useReadingHold((state) => state.hold);
  const release = useReadingHold((state) => state.release);

  return useMutation({
    mutationFn: (seq: string) => {
      if (!token) throw new Error('Not signed in');
      return markUnread(token, workspaceId, channelId, seq);
    },
    // Held before the request, so the open conversation does not read it straight back.
    onMutate: () => hold(channelId),
    onSuccess: (state) =>
      applyRewoundReadState(queryClient, identity, workspaceId, channelId, state),
    onError: () => release(channelId),
  });
}
