import type { AnswerFailure, StarMeState } from '../types';

export const STAR_ME_STATUS_EVENT = 'star-me.status';

/** Where StarMe is with a question, for everyone watching its channel. */
export class StarMeStatusEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly questionId: string,
    public readonly askedByMemberId: string,
    /** The nonce its answer will carry, so a client shows the answer on its way under it. */
    public readonly answerNonce: string,
    public readonly state: StarMeState,
    public readonly failure: AnswerFailure | null = null,
    public readonly privateToUserId?: string,
  ) {}
}
