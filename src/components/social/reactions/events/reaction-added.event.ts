export const REACTION_ADDED_EVENT = 'social.reaction.added';

export class ReactionAddedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly actorMemberId: string,
    public readonly emoji: string,
    public readonly count: number,
    public readonly recentMemberIds: string[],
  ) {}
}
