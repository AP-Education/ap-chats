/** How a member shows to others: a name, a picture, and whether a person or a bot. */
export interface MemberAppearance {
  displayName: string | null;
  avatarPath: string | null;
  isBot: boolean;
}

/** A member as lists, mentions and message headers show them. */
export interface MemberSummary extends MemberAppearance {
  memberId: string;
}

export interface MemberProfile extends MemberAppearance {
  id: string;
  /** The OIDC subject, or a reserved one such as bot:star-me for a bot. */
  oidcUserId: string;
}
