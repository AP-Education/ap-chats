export const MESSAGE_DELETED_EVENT = 'social.message.deleted';
export const PRIVATE_MESSAGE_DELETED_EVENT = 'social.message.deleted.private';

export class MessageDeletedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly seq: string,
    public readonly actorMemberId: string,
    public readonly authorMemberId: string,
    public readonly privateToUserId?: string,
  ) {}
}
