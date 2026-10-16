import { useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { historyQuery } from './useMessageHistory';

/** Starts loading a conversation's history as it is chosen, so the request runs while its page renders. */
export function usePrefetchHistory() {
  const queryClient = useQueryClient();
  const { token, identity } = useQueryAuth();

  return (workspaceId: string, channelId: string) => {
    if (token)
      void queryClient.prefetchInfiniteQuery(historyQuery(identity, token, workspaceId, channelId));
  };
}
