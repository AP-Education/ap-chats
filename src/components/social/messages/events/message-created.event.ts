export const MESSAGE_CREATED_EVENT = 'social.message.created';

export class MessageCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly seq: string,
    public readonly actorMemberId: string,
  ) {}
}
