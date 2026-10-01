export const FORWARD_BATCH_CREATED_EVENT = 'social.forward.batch-created';

export class ForwardBatchCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageIds: string[],
    public readonly firstSeq: string,
    public readonly lastSeq: string,
    public readonly actorMemberId: string,
    public readonly entrySeqs: string[],
  ) {}
}
