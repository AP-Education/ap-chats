import type { SentMessage } from '@/features/social/conversation-scope/extensions';

import { writeToken } from '../social/mentions/mention-tokens';
import type { AskRequest, FailedQuestion, QuestionStatus } from './types';

/** Explicit private intent survives member loading, while mentions and replies need the bot's ID. */
export function asksStarMe(message: SentMessage, starMeId?: string): boolean {
  if (message.input.assistant) return true;
  if (!starMeId) return false;

  const mention = writeToken({ kind: 'member', id: starMeId });
  return message.replyToAuthorId === starMeId || message.input.markdown.includes(mention);
}

export function askRequest(message: SentMessage, questionId: string): AskRequest {
  return { channelId: message.channelId, questionId };
}

/** A question StarMe is on, as the conversation keeps it: its last status and since when it shows. */
export type OpenQuestion = QuestionStatus & { shownSince: string };

/**
 * The channel's questions with the status StarMe just reported. Each keeps the time it first
 * showed, and an answered one stays until the history holds its answer, so nothing blinks between.
 */
export function withStatus(
  questions: OpenQuestion[],
  status: QuestionStatus,
  now: string,
): OpenQuestion[] {
  const shown = questions.find(({ questionId }) => questionId === status.questionId);
  const others = questions.filter((open) => open !== shown);
  return [...others, { ...status, shownSince: shown?.shownSince ?? now }];
}

/** The questions StarMe reports open, each keeping the time it first showed. */
export function withSnapshot(
  questions: OpenQuestion[],
  snapshot: QuestionStatus[],
  now: string,
): OpenQuestion[] {
  const reported = new Set(snapshot.map(({ questionId }) => questionId));
  const stillOpen = questions.filter(({ questionId }) => reported.has(questionId));
  return snapshot.reduce((open, status) => withStatus(open, status, now), stillOpen);
}

/** An answered question leaves once the history holds its answer. */
export function withoutLanded(
  questions: OpenQuestion[],
  landed: ReadonlySet<string>,
): OpenQuestion[] {
  const left = questions.filter(
    ({ state, answerNonce }) => !(state === 'answered' && landed.has(answerNonce)),
  );
  return left.length === questions.length ? questions : left;
}

/** The person's latest question StarMe could not answer. */
export function lastFailure<Question extends QuestionStatus>(
  questions: Question[],
  memberId: string | undefined,
): (Question & FailedQuestion) | undefined {
  return questions
    .filter((question): question is Question & FailedQuestion => question.state === 'failed')
    .filter((question) => question.askedByMemberId === memberId)
    .at(-1);
}
