export const MESSAGE_UPDATED_EVENT = 'social.message.updated';

export class MessageUpdatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly seq: string,
    public readonly actorMemberId: string,
  ) {}
}
