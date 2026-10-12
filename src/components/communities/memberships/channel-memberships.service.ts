import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { AnnounceAccessChanges } from '@/components/workspaces/access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import {
  ChannelAccessSync,
  ChannelPermissionsRepository,
  CommunityAccessService,
} from '../channel-access';
import { ChannelMembershipsRepository } from './repository';
import type { ChannelMembership } from './types';

@Injectable()
export class ChannelMembershipsService {
  constructor(
    private readonly memberships: ChannelMembershipsRepository,
    private readonly access: CommunityAccessService,
    private readonly permissions: ChannelPermissionsRepository,
    private readonly sync: ChannelAccessSync,
  ) {}

  async list(member: WorkspaceMember, channelId: string): Promise<ChannelMembership[]> {
    await this.access.requireVisibleChannel(member, channelId);
    return this.memberships.findAllActiveForChannel(channelId);
  }

  async leave(member: WorkspaceMember, channelId: string): Promise<void> {
    const announce = await this.stepOut(member, channelId);
    announce();
  }

  // Only a personal invitation can be turned down; a role or the whole workspace keeps you in.
  @Transactional()
  private async stepOut(
    member: WorkspaceMember,
    channelId: string,
  ): Promise<AnnounceAccessChanges> {
    await this.access.requireVisibleChannel(member, channelId);

    const sources = await this.permissions.sourcesOf(channelId, member.id);
    if (!sources.length) throw new NotFoundException('Channel member not found');

    const isPersonalOnly = sources.every((source) => source.principal === 'member');
    if (!isPersonalOnly)
      throw new ConflictException('Your access comes from a role or the whole workspace');

    await this.permissions.revokePersonal(member.workspaceId, channelId, member.id);

    return this.sync.refreshMembers(member.workspaceId, [member.id]);
  }
}
