import { skipToken, useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';

import { pickedMessages } from '../api/star-me-api';
import { starMeQueryKeys } from '../queryKeys';

/**
 * The messages a question to StarMe was asked about. They are kept once asked, so they are only
 * read again when StarMe reports on the question.
 */
export function usePickedMessages(questionId: string, enabled: boolean) {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();

  return useQuery({
    queryKey: starMeQueryKeys.picked(identity, workspaceId, channelId, questionId),
    queryFn:
      enabled && token
        ? () => pickedMessages(token, workspaceId, channelId, questionId)
        : skipToken,
    select: (picked) => picked.messages,
    staleTime: Infinity,
  });
}
