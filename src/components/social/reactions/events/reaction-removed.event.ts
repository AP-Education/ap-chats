export const REACTION_REMOVED_EVENT = 'social.reaction.removed';

export class ReactionRemovedEvent {
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
