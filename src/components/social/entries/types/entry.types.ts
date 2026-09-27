export interface ChannelEntry {
  id: string;
  workspaceId: string;
  channelId: string;
  seq: bigint;
  messageId: string;
  createdAt: Date;
}

export interface EntryPosition {
  messageId: string;
  seq: bigint;
}
