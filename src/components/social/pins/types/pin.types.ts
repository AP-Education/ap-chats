export interface MessagePin {
  workspaceId: string;
  channelId: string;
  messageId: string;
  pinnedByMemberId: string;
  pinnedAt: Date;
}
