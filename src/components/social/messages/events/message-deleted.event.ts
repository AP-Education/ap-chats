export const MESSAGE_DELETED_EVENT = 'social.message.deleted';

export class MessageDeletedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly seq: string,
    public readonly actorMemberId: string,
  ) {}
}
