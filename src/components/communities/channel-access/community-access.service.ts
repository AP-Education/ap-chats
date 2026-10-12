import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { isAdministrator } from '@/components/workspaces/access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { ChannelView } from '../channels';
import { channelView } from '../channels/channel.view';
import { ChannelsRepository } from '../channels/repository';

@Injectable()
export class CommunityAccessService {
  constructor(private readonly channels: ChannelsRepository) {}

  /** A channel in the person's lists; workspace managers find every channel. */
  async requireVisibleChannel(member: WorkspaceMember, channelId: string): Promise<ChannelView> {
    const channel = await this.channels.findAsSeenBy(member.workspaceId, channelId, member.id);
    const isVisible = !!channel && (channel.listed !== null || isAdministrator(member));
    if (!isVisible) throw new NotFoundException('Channel not found');

    return channelView(member, channel);
  }

  async requireManageableChannel(member: WorkspaceMember, channelId: string): Promise<ChannelView> {
    const channel = await this.requireVisibleChannel(member, channelId);
    if (!channel.canManage) throw new ForbiddenException('Only the channel managers can change it');

    return channel;
  }
}
