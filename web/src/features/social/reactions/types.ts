/** Where one emoji stands on a message, the same for everyone who sees it. */
export interface ReactionSummary {
  emoji: string;
  count: number;
  /** Up to three of the latest people, enough to show faces instead of a number. */
  recentMemberIds: string[];
}

export interface MessageReaction extends ReactionSummary {
  /** Whether the viewer is among the people who reacted with this emoji. */
  reacted: boolean;
}

export interface Reactor {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  emoji: string;
}

/** Someone added or took back a reaction; `reaction` is the state it left. */
export interface ReactionChangedPayload {
  workspaceId: string;
  channelId: string;
  messageId: string;
  actorMemberId: string;
  added: boolean;
  reaction: ReactionSummary;
}
