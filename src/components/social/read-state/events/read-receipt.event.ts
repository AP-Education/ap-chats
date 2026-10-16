export const READ_RECEIPT_EVENT = 'social.read-state.receipt';

/** How far a member has read, for the others in a conversation that shares read receipts. */
export class ReadReceiptEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly memberId: string,
    public readonly seq: string,
  ) {}
}
