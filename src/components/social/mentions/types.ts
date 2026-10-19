/** Who a message addresses as written; recipients are expanded from this when it is stored. */
export interface MentionTargets {
  memberIds: string[];
  roleIds: string[];
  everyone: boolean;
}

export interface MentionedMessage {
  workspaceId: string;
  channelId: string;
  messageId: string;
  authorMemberId: string;
}

/** Someone a message reached, by the seq of the entry that holds it in its conversation. */
export interface EntryMention {
  seq: string;
  memberId: string;
}
