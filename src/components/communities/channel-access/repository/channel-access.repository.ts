import type { ChannelAccessSnapshot } from '../../channels/types/channel-access.types';

export abstract class ChannelAccessRepository {
  abstract lockChannel(
    workspaceId: string,
    channelId: string,
    strength: 'update' | 'key share',
  ): Promise<ChannelAccessSnapshot | undefined>;

  abstract findChannel(
    workspaceId: string,
    channelId: string,
  ): Promise<ChannelAccessSnapshot | undefined>;

  abstract isActiveWorkspaceMember(workspaceId: string, memberId: string): Promise<boolean>;

  abstract isChannelMember(channelId: string, memberId: string): Promise<boolean>;

  /** Whether the other side of the member's direct message is an active person, not a bot. */
  abstract isDmPeerReachable(channelId: string, memberId: string): Promise<boolean>;
}
