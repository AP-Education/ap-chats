// Mirrors STAR_ME.subject in the API's star-me/star-me.identity.ts.
export const STAR_ME_SUBJECT = 'bot:star-me';

export const STAR_ME_STATUS_EVENT = 'star-me.status';

/** Why StarMe could not answer, as the asking person is told. */
export type AnswerFailure = 'limited' | 'forbidden' | 'unavailable' | 'failed';

/** The person's own posted message for StarMe to answer in a reply. */
export interface AnswerRequest {
  questionId: string;
}

/** A question for StarMe to answer, in the channel it was posted in. */
export interface AskRequest extends AnswerRequest {
  channelId: string;
}

interface QuestionRef {
  workspaceId: string;
  channelId: string;
  questionId: string;
  askedByMemberId: string;
}

/** Where StarMe is with a question; a failed one always says why. */
export type QuestionStatus = QuestionRef &
  ({ state: 'thinking' | 'answered'; failure: null } | { state: 'failed'; failure: AnswerFailure });

export type FailedQuestion = Extract<QuestionStatus, { state: 'failed' }>;

export type StarMeStatusEvent = QuestionStatus & { type: typeof STAR_ME_STATUS_EVENT };

// StarMe's status rides the channel broadcast every channel feature shares.
export type StarMeServerToClientEvents = {
  'social:changed': (payload: { type: string } | StarMeStatusEvent) => void;
};
