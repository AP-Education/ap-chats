/** Where one emoji stands on a message: shared by everyone who sees it. */
export interface ReactionState {
  emoji: string;
  count: number;
  /** Up to three of the latest people, enough to show faces instead of a number. */
  recentMemberIds: string[];
}

export interface MessageReaction extends ReactionState {
  reacted: boolean;
}

export interface Reactor {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  emoji: string;
}
