import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelsRepository } from '../channels/repository';
import type { Channel } from '../channels/types';
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
      channel.kind === 'private' &&
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
    if (channel.kind === 'private') {
      await this.requireChannelMember(channel, member.id);
      return;
    }
    if (member.role !== 'owner' && channel.createdByMemberId !== member.id) {
      throw new ForbiddenException('Only the channel creator or workspace owner can manage it');
    }
  }
}
