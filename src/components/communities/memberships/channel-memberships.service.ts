import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CommunityAccessService } from '../channel-access/community-access.service';
import { ChannelMembershipsRepository } from './repository';
import type { ChannelMembership } from './types';

@Injectable()
export class ChannelMembershipsService {
  constructor(
    private readonly memberships: ChannelMembershipsRepository,
    private readonly workspaceMembers: WorkspaceMembersRepository,
    private readonly access: CommunityAccessService,
  ) {}

  async list(member: WorkspaceMember, channelId: string): Promise<ChannelMembership[]> {
    await this.access.requireVisibleChannel(member.workspaceId, channelId, member.id);
    return this.memberships.findAllActiveForChannel(channelId);
  }

  join(member: WorkspaceMember, channelId: string): Promise<ChannelMembership> {
    return this.memberships.joinPublic(member.workspaceId, channelId, member.id);
  }

  async add(
    member: WorkspaceMember,
    channelId: string,
    targetMemberId: string,
  ): Promise<ChannelMembership> {
    const channel = await this.access.requireVisibleChannel(
      member.workspaceId,
      channelId,
      member.id,
    );
    await this.access.requireChannelMember(channel, member.id);
    const target = await this.workspaceMembers.findById(member.workspaceId, targetMemberId);
    if (!target) throw new NotFoundException('Workspace member not found');
    return this.memberships.add(member.workspaceId, channelId, target.id);
  }

  async remove(member: WorkspaceMember, channelId: string, targetMemberId?: string): Promise<void> {
    const channel = await this.access.requireVisibleChannel(
      member.workspaceId,
      channelId,
      member.id,
    );
    const target = targetMemberId ?? member.id;
    if (target !== member.id) {
      if (!(await this.access.isChannelMember(channelId, member.id))) {
        throw new ForbiddenException('Join this channel first');
      }
      await this.access.requireManager(channel, member);
    }
    if (!(await this.memberships.remove(member.workspaceId, channelId, target))) {
      throw new NotFoundException('Channel member not found');
    }
  }
}
