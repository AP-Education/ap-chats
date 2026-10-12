export interface ChannelMembership {
  workspaceId: string;
  channelId: string;
  memberId: string;
  joinedAt: Date;
  /** The person's top role among those listed as their own group, if any. */
  hoistedRoleId: string | null;
  /** The colour of the person's top coloured role, for their name. */
  roleColor: string | null;
}

export interface ChannelMemberPair {
  channelId: string;
  memberId: string;
}

/** Which people's channels to bring in line with the channels' lists. */
export type MembershipScope =
  { workspaceId: string; channelIds: string[] } | { workspaceId: string; memberIds: string[] };

export interface MembershipChanges {
  granted: ChannelMemberPair[];
  revoked: ChannelMemberPair[];
}
