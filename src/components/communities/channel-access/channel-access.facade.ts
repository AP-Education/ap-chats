import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { ChannelAccessSnapshot } from '../channels/types/channel-access.types';
import { ChannelAccessRepository } from './repository/channel-access.repository';

@Injectable()
export class ChannelAccessFacade {
  constructor(private readonly repository: ChannelAccessRepository) {}

  async requirePostAccess(
    member: WorkspaceMember,
    channelId: string,
  ): Promise<ChannelAccessSnapshot> {
    const channel = await this.repository.lockChannel(member.workspaceId, channelId, 'update');
    if (!channel) throw new NotFoundException('Channel not found');
    await this.requireActiveMember(member);
    if (!(await this.repository.isChannelMember(channelId, member.id)))
      throw new ForbiddenException('Join this channel first');
    if (channel.kind === 'dm' && !(await this.repository.isDmPeerActive(channelId, member.id)))
      throw new ForbiddenException('Direct message participant is unavailable');
    return channel;
  }

  async requireReadAccess(
    member: WorkspaceMember,
    channelId: string,
  ): Promise<{ channel: ChannelAccessSnapshot; isMember: boolean }> {
    const channel = await this.repository.lockChannel(member.workspaceId, channelId, 'key share');
    if (!channel) throw new NotFoundException('Channel not found');
    await this.requireActiveMember(member);
    const isMember = await this.repository.isChannelMember(channelId, member.id);
    if (channel.kind !== 'public' && !isMember) throw new NotFoundException('Channel not found');
    return { channel, isMember };
  }

  async requireForwardAccess(
    member: WorkspaceMember,
    sourceChannelId: string,
    targetChannelId: string,
  ): Promise<ChannelAccessSnapshot> {
    const locked = new Map<string, ChannelAccessSnapshot>();
    for (const id of [...new Set([sourceChannelId, targetChannelId])].sort()) {
      const channel = await this.repository.lockChannel(member.workspaceId, id, 'update');
      if (!channel) throw new NotFoundException('Channel not found');
      locked.set(id, channel);
    }
    await this.requireActiveMember(member);
    const source = locked.get(sourceChannelId);
    const target = locked.get(targetChannelId);
    if (!source || !target) throw new NotFoundException('Channel not found');
    if (source.kind !== 'public' && !(await this.repository.isChannelMember(source.id, member.id)))
      throw new NotFoundException('Channel not found');
    if (!(await this.repository.isChannelMember(target.id, member.id)))
      throw new ForbiddenException('Join the destination channel first');
    if (target.kind === 'dm' && !(await this.repository.isDmPeerActive(target.id, member.id)))
      throw new ForbiddenException('Direct message participant is unavailable');
    return target;
  }

  requireManager(member: WorkspaceMember, channel: ChannelAccessSnapshot): void {
    if (channel.kind === 'dm')
      throw new ForbiddenException('Direct messages have no channel manager');
    if (member.role !== 'owner')
      throw new ForbiddenException('Only the workspace owner can manage channels');
  }

  private async requireActiveMember(member: WorkspaceMember): Promise<void> {
    if (!(await this.repository.isActiveWorkspaceMember(member.workspaceId, member.id)))
      throw new ForbiddenException('Not a member of this workspace');
  }
}
