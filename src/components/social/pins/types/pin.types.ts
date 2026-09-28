export interface MessagePin {
  workspaceId: string;
  channelId: string;
  messageId: string;
  pinnedByMemberId: string;
  pinnedAt: Date;
}

export interface PinnedMessage {
  messageId: string;
  seq: string;
  pinnedAt: Date;
  pinnedByMemberId: string;
  authorMemberId: string;
  author: { memberId: string; displayName: string | null; avatarPath: string | null };
  markdown: string;
}
