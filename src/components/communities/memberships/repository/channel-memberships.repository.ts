import type { ChannelMembership } from '../types';

export abstract class ChannelMembershipsRepository {
  abstract findAllActiveForChannel(channelId: string): Promise<ChannelMembership[]>;
  abstract isMember(channelId: string, memberId: string): Promise<boolean>;
  abstract joinPublic(
    workspaceId: string,
    channelId: string,
    memberId: string,
  ): Promise<ChannelMembership>;
  abstract add(
    workspaceId: string,
    channelId: string,
    memberId: string,
  ): Promise<ChannelMembership>;
  abstract remove(workspaceId: string, channelId: string, memberId: string): Promise<boolean>;
}
