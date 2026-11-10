export const MESSAGE_CREATED_EVENT = 'social.message.created';
export const PRIVATE_MESSAGE_CREATED_EVENT = 'social.message.created.private';

export class MessageCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly seq: string,
    public readonly actorMemberId: string,
    public readonly privateToUserId?: string,
  ) {}
}
