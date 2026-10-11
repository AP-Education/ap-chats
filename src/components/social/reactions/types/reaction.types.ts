/** Where one emoji stands on a message, the same for everyone who sees it. */
export interface ReactionSummary {
  emoji: string;
  count: number;
  /** Up to three of the latest people, enough to show faces instead of a number. */
  recentMemberIds: string[];
}

export interface MessageReaction extends ReactionSummary {
  reacted: boolean;
}

export interface Reactor {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  emoji: string;
}

export interface ReactedMessage {
  workspaceId: string;
  channelId: string;
  messageId: string;
}
