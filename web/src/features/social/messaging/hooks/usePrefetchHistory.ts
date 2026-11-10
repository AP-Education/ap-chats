import { useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { readChatWindow } from '../timeline/useChatTimeline';

/** Starts loading a conversation's history as it is chosen, so the request runs while its page renders. */
export function usePrefetchHistory() {
  const queryClient = useQueryClient();
  const { token, identity } = useQueryAuth();

  return (workspaceId: string, channelId: string) => {
    if (token)
      void queryClient.prefetchQuery(
        readChatWindow(queryClient, identity, token, workspaceId, channelId),
      );
  };
}
