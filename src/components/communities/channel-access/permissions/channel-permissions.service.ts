import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { AnnounceAccessChanges } from '@/components/workspaces/access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CommunityAccessService } from '../community-access.service';
import { ChannelAccessSync } from '../sync/channel-access.sync';
import { ChannelPermissionsRepository } from './repository/channel-permissions.repository';
import type { ChannelPermissions, ChannelPermissionsView } from './types';

@Injectable()
export class ChannelPermissionsService {
  constructor(
    private readonly access: CommunityAccessService,
    private readonly permissions: ChannelPermissionsRepository,
    private readonly sync: ChannelAccessSync,
  ) {}

  async describe(member: WorkspaceMember, channelId: string): Promise<ChannelPermissionsView> {
    await this.access.requireManageableChannel(member, channelId);
    return this.permissions.describe(member.workspaceId, channelId);
  }

  async change(
    member: WorkspaceMember,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<ChannelPermissionsView> {
    const announce = await this.apply(member, channelId, permissions);
    announce();

    return this.permissions.describe(member.workspaceId, channelId);
  }

  @Transactional()
  private async apply(
    member: WorkspaceMember,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<AnnounceAccessChanges> {
    await this.access.requireManageableChannel(member, channelId);

    await this.permissions.replace(member.workspaceId, channelId, permissions);

    return this.sync.refreshChannel(member.workspaceId, channelId);
  }
}
