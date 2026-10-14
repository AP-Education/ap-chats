import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { WorkspaceMember } from '@/components/workspaces/members/types';
import type { Announce } from '@/globals/publisher/types';

import { ChannelAccessSync } from '../sync';
import { ChannelVisibility } from './channel-visibility.service';
import { ChannelPermissionsRepository } from './repository/channel-permissions.repository';
import type { ChannelPermissions, ChannelPermissionsView } from './types';

/** The channel's three lists, and everyone they reach kept in step with them. */
@Injectable()
export class ChannelPermissionsService {
  constructor(
    private readonly permissions: ChannelPermissionsRepository,
    private readonly sync: ChannelAccessSync,
    private readonly visibility: ChannelVisibility,
  ) {}

  async describe(member: WorkspaceMember, channelId: string): Promise<ChannelPermissionsView> {
    await this.visibility.requireManageable(member, channelId);

    return this.permissions.describe(member.workspaceId, channelId);
  }

  async change(
    member: WorkspaceMember,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<ChannelPermissionsView> {
    const announce = await this.relist(member, channelId, permissions);
    announce();

    return this.permissions.describe(member.workspaceId, channelId);
  }

  /** Joins the caller's transaction, so a new channel and its lists commit together. */
  @Transactional()
  async assign(
    workspaceId: string,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<Announce> {
    await this.permissions.replace(workspaceId, channelId, permissions);

    return this.sync.refreshChannel(workspaceId, channelId);
  }

  /** Everyone in the channel loses it; runs in the transaction that deletes it, announcing after commit. */
  close(workspaceId: string, channelId: string): Promise<Announce> {
    return this.sync.closeChannel(workspaceId, channelId);
  }

  @Transactional()
  private async relist(
    member: WorkspaceMember,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<Announce> {
    await this.visibility.requireManageable(member, channelId);

    return this.assign(member.workspaceId, channelId, permissions);
  }
}
