import type { PendingEntry } from '@ap-education/timeline';

import type { ExtensionEntry } from '@/features/social/messaging/timeline/chat-entry';
import type { MemberSummary } from '@/features/workspaces/types';

import { lastFailure, type OpenQuestion } from './questions';
import type { AnswerFailure } from './types';

export const STAR_ME_ANSWER = 'extension:star-me-answer';

export interface AnswerPayload {
  author: MemberSummary;
  questionId: string;
  failure: AnswerFailure | null;
}

/** StarMe's answer on its way, in StarMe's run until the answer itself takes its place. */
export type AnswerEntry = ExtensionEntry<'star-me-answer', AnswerPayload>;

/**
 * StarMe's answers on their way: one for each question it is answering, kept after it answers
 * until the history holds the answer; with none, the person's latest question it could not answer.
 */
export function answersOnTheirWay(
  questions: OpenQuestion[],
  starMe: MemberSummary,
  viewerId: string | undefined,
): PendingEntry<AnswerEntry>[] {
  const coming = questions.filter(({ state }) => state !== 'failed');
  if (coming.length) return coming.map((question) => answerOf(question, starMe, 'sending'));

  const failed = lastFailure(questions, viewerId);
  return failed ? [answerOf(failed, starMe, 'failed')] : [];
}

// Under the nonce the answer will carry, so the history's answer takes the row's place.
function answerOf(
  question: OpenQuestion,
  starMe: MemberSummary,
  status: PendingEntry<AnswerEntry>['status'],
): PendingEntry<AnswerEntry> {
  const { answerNonce, questionId, failure, shownSince } = question;

  return {
    nonce: answerNonce,
    status,
    entry: {
      key: answerNonce,
      position: '0',
      kind: STAR_ME_ANSWER,
      at: shownSince,
      author: starMe.memberId,
      nonce: answerNonce,
      payload: { author: starMe, questionId, failure },
    },
  };
}
