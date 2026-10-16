/** How far a member has read a conversation that shares read receipts. */
export interface ReadReceipt {
  workspaceId: string;
  channelId: string;
  memberId: string;
  seq: string;
}
