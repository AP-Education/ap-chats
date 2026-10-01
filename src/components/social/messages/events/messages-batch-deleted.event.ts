export const MESSAGES_BATCH_DELETED_EVENT = 'social.messages.batch-deleted';

export interface DeletedMessageEntry {
  seq: string;
  authorMemberId: string;
}

export class MessagesBatchDeletedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageIds: string[],
    public readonly actorMemberId: string,
    public readonly deletedEntries: DeletedMessageEntry[],
  ) {}
}
