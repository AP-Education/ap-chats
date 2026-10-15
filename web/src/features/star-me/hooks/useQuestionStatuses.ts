import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';
import { useConversationScope } from '@/features/social/conversation/store';

import { questionStatuses } from '../api/star-me-api';
import { starMeQueryKeys } from '../queryKeys';
import { withStatus } from '../questions';
import {
  type QuestionStatus,
  STAR_ME_STATUS_EVENT,
  type StarMeServerToClientEvents,
  type StarMeStatusEvent,
} from '../types';

const NO_QUESTIONS: QuestionStatus[] = [];

/**
 * The conversation's open questions to StarMe. Taken whole whenever the socket connects, since
 * what StarMe reported while it was away is not replayed, then kept current by its reports.
 */
export function useQuestionStatuses(): QuestionStatus[] {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const { status: connection } = useConnection();
  const queryClient = useQueryClient();
  const queryKey = starMeQueryKeys.status(identity, workspaceId, channelId);

  const { data = NO_QUESTIONS } = useQuery({
    queryKey,
    queryFn:
      token && connection === 'connected'
        ? async () => (await questionStatuses(token, workspaceId, channelId)).questions
        : skipToken,
    staleTime: 0,
  });

  useSocketEvent<StarMeServerToClientEvents>('social:changed', (event) => {
    if (!isStatus(event) || event.channelId !== channelId) return;

    const snapshotLoading = queryClient.getQueryState(queryKey)?.fetchStatus === 'fetching';
    queryClient.setQueryData<QuestionStatus[]>(queryKey, (current = NO_QUESTIONS) =>
      withStatus(current, event),
    );
    // A snapshot taken before this report would land over it.
    if (snapshotLoading) void queryClient.invalidateQueries({ queryKey, exact: true });

    // StarMe reports once it has taken the question, with the messages picked for it.
    void queryClient.invalidateQueries({
      queryKey: starMeQueryKeys.picked(identity, workspaceId, channelId, event.questionId),
    });
  });

  return data;
}

function isStatus(event: { type: string }): event is StarMeStatusEvent {
  return event.type === STAR_ME_STATUS_EVENT;
}
