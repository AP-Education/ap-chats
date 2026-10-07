import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { Channel } from '../channels';
import { ChannelsRepository } from '../channels/repository';
import { ChannelMembershipsRepository } from '../memberships/repository';

@Injectable()
export class CommunityAccessService {
  constructor(
    private readonly channels: ChannelsRepository,
    private readonly channelMemberships: ChannelMembershipsRepository,
  ) {}

  async requireVisibleChannel(
    workspaceId: string,
    channelId: string,
    memberId: string,
  ): Promise<Channel> {
    const channel = await this.channels.findById(workspaceId, channelId);
    if (!channel) throw new NotFoundException('Channel not found');
    if (
      channel.kind !== 'public' &&
      !(await this.channelMemberships.isMember(channelId, memberId))
    ) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  isChannelMember(channelId: string, memberId: string): Promise<boolean> {
    return this.channelMemberships.isMember(channelId, memberId);
  }

  async requireChannelMember(channel: Channel, memberId: string): Promise<void> {
    if (!(await this.isChannelMember(channel.id, memberId))) {
      throw new ForbiddenException('Join this channel first');
    }
  }

  async requireManager(channel: Channel, member: WorkspaceMember): Promise<void> {
    if (channel.kind === 'dm')
      throw new ForbiddenException('Direct messages have no channel manager');
    if (member.role !== 'owner')
      throw new ForbiddenException('Only the workspace owner can manage channels');
    if (channel.kind === 'private') {
      await this.requireChannelMember(channel, member.id);
    }
  }
}
