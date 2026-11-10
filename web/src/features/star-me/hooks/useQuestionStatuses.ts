import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { questionStatuses } from '../api/star-me-api';
import { starMeQueryKeys } from '../queryKeys';
import { type OpenQuestion, withoutLanded, withSnapshot, withStatus } from '../questions';
import {
  STAR_ME_STATUS_EVENT,
  type StarMeServerToClientEvents,
  type StarMeStatusEvent,
} from '../types';

const NO_QUESTIONS: OpenQuestion[] = [];

/**
 * The conversation's open questions to StarMe. Taken whole whenever the socket connects, since
 * what StarMe reported while it was away is not replayed, then kept current by its reports; an
 * answered one leaves once the history holds its answer.
 */
export function useQuestionStatuses(landed: ReadonlySet<string>): OpenQuestion[] {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const { status: connection } = useConnection();
  const queryClient = useQueryClient();
  const queryKey = starMeQueryKeys.status(identity, workspaceId, channelId);

  const { data = NO_QUESTIONS } = useQuery({
    queryKey,
    queryFn:
      token && connection === 'connected'
        ? async () => {
            const { questions } = await questionStatuses(token, workspaceId, channelId);
            const shown = queryClient.getQueryData<OpenQuestion[]>(queryKey) ?? NO_QUESTIONS;
            return withSnapshot(shown, questions, new Date().toISOString());
          }
        : skipToken,
    staleTime: 0,
  });

  useSocketEvent<StarMeServerToClientEvents>('social:changed', (event) => {
    if (!isStatus(event) || event.channelId !== channelId) return;

    const snapshotLoading = queryClient.getQueryState(queryKey)?.fetchStatus === 'fetching';
    const now = new Date().toISOString();
    queryClient.setQueryData<OpenQuestion[]>(queryKey, (current = NO_QUESTIONS) =>
      withStatus(current, event, now),
    );
    // A snapshot taken before this report would land over it.
    if (snapshotLoading) void queryClient.invalidateQueries({ queryKey, exact: true });
  });

  useEffect(() => {
    const hasLanded = withoutLanded(data, landed) !== data;
    if (!hasLanded) return;

    queryClient.setQueryData<OpenQuestion[]>(queryKey, (current = NO_QUESTIONS) =>
      withoutLanded(current, landed),
    );
  }, [data, landed, queryClient, queryKey]);

  return data;
}

function isStatus(event: { type: string }): event is StarMeStatusEvent {
  return event.type === STAR_ME_STATUS_EVENT;
}
