import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { AnnounceAccessChanges } from '@/components/workspaces/access/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

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
  ): Promise<AnnounceAccessChanges> {
    await this.permissions.replace(workspaceId, channelId, permissions);

    return this.sync.refreshChannel(workspaceId, channelId);
  }

  /** Everyone in the channel loses it; runs in the transaction that deletes it, announcing after commit. */
  close(workspaceId: string, channelId: string): Promise<AnnounceAccessChanges> {
    return this.sync.closeChannel(workspaceId, channelId);
  }

  async leave(member: WorkspaceMember, channelId: string): Promise<void> {
    const announce = await this.declineInvitation(member, channelId);
    announce();
  }

  @Transactional()
  private async relist(
    member: WorkspaceMember,
    channelId: string,
    permissions: ChannelPermissions,
  ): Promise<AnnounceAccessChanges> {
    await this.visibility.requireManageable(member, channelId);

    return this.assign(member.workspaceId, channelId, permissions);
  }

  // Only a personal invitation can be turned down; a role or the whole workspace keeps you in.
  @Transactional()
  private async declineInvitation(
    member: WorkspaceMember,
    channelId: string,
  ): Promise<AnnounceAccessChanges> {
    await this.visibility.requireVisible(member, channelId);

    const sources = await this.permissions.sourcesOf(channelId, member.id);
    if (!sources.length) throw new NotFoundException('Channel member not found');

    const isPersonalOnly = sources.every((source) => source.principal === 'member');
    if (!isPersonalOnly)
      throw new ConflictException('Your access comes from a role or the whole workspace');

    await this.permissions.revokePersonal(member.workspaceId, channelId, member.id);

    return this.sync.refreshMembers(member.workspaceId, [member.id]);
  }
}
