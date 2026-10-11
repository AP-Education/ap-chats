/** Who a message addresses as written; recipients are expanded from this when it is stored. */
export interface MentionTargets {
  memberIds: string[];
  everyone: boolean;
}

export interface MentionedMessage {
  workspaceId: string;
  channelId: string;
  messageId: string;
  authorMemberId: string;
}
