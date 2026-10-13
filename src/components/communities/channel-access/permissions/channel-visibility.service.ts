import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { isAdministrator } from '@/components/workspaces/access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelsRepository } from '../../channels';
import { channelView } from '../../channels/channel.view';
import type { ChannelView } from '../../channels/types';

/** Which channels a person finds in the workspace's structure, and which of them they run. */
@Injectable()
export class ChannelVisibility {
  constructor(private readonly channels: ChannelsRepository) {}

  /** A channel in the person's lists; workspace managers find every channel. */
  async requireVisible(member: WorkspaceMember, channelId: string): Promise<ChannelView> {
    const channel = await this.channels.findAsSeenBy(member.workspaceId, channelId, member.id);
    const isVisible = !!channel && (channel.listed !== null || isAdministrator(member));
    if (!isVisible) throw new NotFoundException('Channel not found');

    return channelView(member, channel);
  }

  async requireManageable(member: WorkspaceMember, channelId: string): Promise<ChannelView> {
    const channel = await this.requireVisible(member, channelId);
    if (!channel.canManage) throw new ForbiddenException('Only the channel managers can change it');

    return channel;
  }
}
