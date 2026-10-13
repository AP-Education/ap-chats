import type { ChannelAccessSnapshot } from '../types';

export abstract class ChannelAccessRepository {
  /** The channel as seen by one of its participants; nothing when the person is not one. */
  abstract findParticipation(
    workspaceId: string,
    channelId: string,
    memberId: string,
    lock?: 'update' | 'key share',
  ): Promise<ChannelAccessSnapshot | undefined>;

  abstract isActiveWorkspaceMember(workspaceId: string, memberId: string): Promise<boolean>;

  abstract isDmPeerActive(channelId: string, memberId: string): Promise<boolean>;
}
