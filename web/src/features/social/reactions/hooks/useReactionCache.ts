import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';
import { messagingQueryKeys } from '@/features/social/messaging/queryKeys';

import { type HistoryData, type ReactionChange, withReactionChange } from '../reaction-cache';

/** Writes a reaction's new state into every cached history window of the open conversation. */
export function useReactionCache() {
  const { workspaceId, channelId } = useConversationScope();
  const { identity } = useQueryAuth();
  const queryClient = useQueryClient();

  return useCallback(
    (messageId: string, change: ReactionChange) => {
      const histories = messagingQueryKeys.histories(identity, workspaceId, channelId);
      queryClient.setQueriesData<HistoryData>(
        { queryKey: histories },
        (history) => history && withReactionChange(history, messageId, change),
      );
    },
    [queryClient, identity, workspaceId, channelId],
  );
}
