export interface ChannelMemberPair {
  channelId: string;
  memberId: string;
}

/** Whose participation to bring in line with the lists: every person of these channels, or every channel of these people. */
export type ParticipationScope =
  { workspaceId: string; channelIds: string[] } | { workspaceId: string; memberIds: string[] };

export interface ParticipationChanges {
  granted: ChannelMemberPair[];
  revoked: ChannelMemberPair[];
}
