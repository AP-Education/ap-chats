export interface MessageReaction {
  emoji: string;
  count: number;
  /** Up to three of the latest people, enough to show faces instead of a number. */
  recentMemberIds: string[];
  /** Whether the viewer is among the people who reacted with this emoji. */
  reacted: boolean;
}

export interface Reactor {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  emoji: string;
}
