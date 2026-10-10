import type { ReactionSummary } from '../types/reaction.types';

export const REACTION_CHANGED_EVENT = 'social.reaction.changed';

export class ReactionChangedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly actorMemberId: string,
    /** Whether the actor added their reaction or took it back. */
    public readonly added: boolean,
    public readonly reaction: ReactionSummary,
  ) {}
}
