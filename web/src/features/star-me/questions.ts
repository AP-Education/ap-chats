import type { SentMessage } from '@/features/social/conversation-scope/extensions';

import { writeToken } from '../social/mentions/mention-tokens';
import type { AskRequest, FailedQuestion, QuestionStatus } from './types';

/** A message asks StarMe when it mentions StarMe or replies to it; asking about picked messages mentions it too. */
export function asksStarMe(message: SentMessage, starMeId: string): boolean {
  const mention = writeToken({ kind: 'member', id: starMeId });
  return message.replyToAuthorId === starMeId || message.input.markdown.includes(mention);
}

export function askRequest(message: SentMessage, questionId: string): AskRequest {
  return {
    channelId: message.channelId,
    questionId,
    ...(message.picked ? { contextMessageIds: message.picked } : {}),
  };
}

/** The channel's open questions with the status StarMe just reported; an answered one leaves. */
export function withStatus(statuses: QuestionStatus[], status: QuestionStatus): QuestionStatus[] {
  const others = statuses.filter((open) => open.questionId !== status.questionId);
  return status.state === 'answered' ? others : [...others, status];
}

export function isThinking(status: QuestionStatus): boolean {
  return status.state === 'thinking';
}

/** The person's latest question StarMe could not answer. */
export function lastFailure(
  statuses: QuestionStatus[],
  memberId: string | undefined,
): FailedQuestion | undefined {
  return statuses
    .filter((status): status is FailedQuestion => status.state === 'failed')
    .filter((status) => status.askedByMemberId === memberId)
    .at(-1);
}
