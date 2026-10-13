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
