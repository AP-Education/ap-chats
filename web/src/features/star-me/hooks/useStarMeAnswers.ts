import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConversationScope } from '@/features/social/conversation/store';
import { ApiError } from '@/shared/api/http';

import { answerQuestion } from '../api/star-me-api';
import { starMeQueryKeys } from '../queryKeys';
import {
  type AnswerFailure,
  type AnswerRequest,
  STAR_ME_STATUS_EVENT,
  type StarMeServerToClientEvents,
  type StarMeStatusEvent,
} from '../types';

const FAILURE_BY_STATUS: Record<number, AnswerFailure> = {
  429: 'limited',
  403: 'forbidden',
  503: 'unavailable',
};

/** An answer StarMe could not give the person, and the way to ask for it again. */
export interface StarMeFailure {
  failure: AnswerFailure;
  retry: () => void;
}

interface OwnAnswer {
  request: AnswerRequest;
  failure: AnswerFailure | null;
}

/**
 * StarMe's answers in the conversation. The person's own are requested from here, so a failed
 * one can be asked again; everyone else's arrive as StarMe reports on them.
 */
export function useStarMeAnswers(currentMemberId: string | undefined) {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const [own, setOwn] = useState<ReadonlyMap<string, OwnAnswer>>(() => new Map());
  const [othersThinking, setOthersThinking] = useState<ReadonlySet<string>>(() => new Set());

  useSocketEvent<StarMeServerToClientEvents>('social:changed', (event) => {
    if (!isStatus(event) || event.channelId !== channelId) return;
    // StarMe reports once it has taken the question, picked messages included.
    void queryClient.invalidateQueries({
      queryKey: starMeQueryKeys.picked(identity, workspaceId, channelId, event.questionId),
    });
    if (event.askedByMemberId === currentMemberId) return;

    setOthersThinking((current) => {
      const next = new Set(current);
      if (event.state === 'thinking') next.add(event.questionId);
      else next.delete(event.questionId);
      return next;
    });
  });

  const track = useCallback((questionId: string, entry: OwnAnswer | null) => {
    setOwn((current) => {
      const next = new Map(current);
      if (entry) next.set(questionId, entry);
      else next.delete(questionId);
      return next;
    });
  }, []);

  const { mutate: request } = useMutation({
    mutationFn: (answer: AnswerRequest) => {
      if (!token) throw new Error('Not signed in');
      return answerQuestion(token, workspaceId, channelId, answer);
    },
    onMutate: (answer) => track(answer.questionId, { request: answer, failure: null }),
    onSuccess: (_, answer) => track(answer.questionId, null),
    onError: (error, answer) =>
      track(answer.questionId, { request: answer, failure: failureOf(error) }),
  });

  const thinking = othersThinking.size > 0 || [...own.values()].some((entry) => !entry.failure);
  const failed = [...own.values()].filter((entry) => entry.failure).at(-1);
  const failure: StarMeFailure | null = failed?.failure
    ? { failure: failed.failure, retry: () => request(failed.request) }
    : null;

  return { request, thinking, failure };
}

function isStatus(event: { type: string }): event is StarMeStatusEvent {
  return event.type === STAR_ME_STATUS_EVENT;
}

function failureOf(error: unknown): AnswerFailure {
  if (!(error instanceof ApiError)) return 'unavailable';
  return FAILURE_BY_STATUS[error.status] ?? 'failed';
}
