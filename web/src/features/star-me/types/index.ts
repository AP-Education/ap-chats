import type { MemberSummary } from '@/features/workspaces/types';

// Mirrors STAR_ME.subject in the API's star-me/star-me.identity.ts.
export const STAR_ME_SUBJECT = 'bot:star-me';

export const STAR_ME_STATUS_EVENT = 'star-me.status';

/** Why StarMe could not answer, as the asking person is told. */
export type AnswerFailure = 'limited' | 'forbidden' | 'unavailable' | 'failed';

/** The person's own posted message for StarMe to answer in a reply. */
export interface AnswerRequest {
  questionId: string;
  /** Messages the person picked for StarMe to read instead of the latest ones. */
  contextMessageIds?: string[];
}

/** A message the person picked when asking, as anyone reading the channel sees it. */
export interface PickedMessage {
  id: string;
  author: MemberSummary;
  markdown: string;
}

export interface StarMeStatusEvent {
  type: typeof STAR_ME_STATUS_EVENT;
  workspaceId: string;
  channelId: string;
  questionId: string;
  askedByMemberId: string;
  state: 'thinking' | 'answered' | 'failed';
  failure: AnswerFailure | null;
}

// StarMe's status rides the channel broadcast every channel feature shares.
export type StarMeServerToClientEvents = {
  'social:changed': (payload: { type: string } | StarMeStatusEvent) => void;
};
