import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { requireAccessLevel } from '@/components/workspaces/access';
import type { AnnounceAccessChanges } from '@/components/workspaces/access/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelPermissionsService } from '../channel-access/permissions';
import { ChannelVisibility } from '../channel-access/permissions';
import { toChannelPermissions } from '../channel-access/permissions/dto/channel-permissions.dto';
import type { ChannelPermissions } from '../channel-access/permissions/types';
import { ChannelCategoriesRepository } from '../channel-categories';
import { ChannelsRepository } from '../channels';
import { channelView } from '../channels/channel.view';
import type { ChannelView } from '../channels/types';
import type { CreateChannelDto } from './dto/create-channel.dto';
import type { UpdateChannelDto } from './dto/update-channel.dto';

interface OpenedChannel {
  channelId: string;
  announce: AnnounceAccessChanges;
}

/** The workspace's channels as people find and run them: listing, opening, renaming, closing. */
@Injectable()
export class ChannelDirectoryService {
  constructor(
    private readonly channels: ChannelsRepository,
    private readonly categories: ChannelCategoriesRepository,
    private readonly visibility: ChannelVisibility,
    private readonly permissions: ChannelPermissionsService,
  ) {}

  /** `all` is the workspace's whole directory, which only its managers run. */
  async list(member: WorkspaceMember, scope: 'mine' | 'all'): Promise<ChannelView[]> {
    if (scope === 'all') requireAccessLevel(member, 'manager');

    const channels =
      scope === 'all'
        ? await this.channels.findAllAsSeenBy(member.workspaceId, member.id)
        : await this.channels.findListedFor(member.workspaceId, member.id);

    return channels.map((channel) => channelView(member, channel));
  }

  get(member: WorkspaceMember, channelId: string): Promise<ChannelView> {
    return this.visibility.requireVisible(member, channelId);
  }

  async create(member: WorkspaceMember, dto: CreateChannelDto): Promise<ChannelView> {
    requireAccessLevel(member, 'manager');

    const permissions = this.withCreatorManaging(toChannelPermissions(dto.permissions), member);
    const { channelId, announce } = await this.open(member, dto, permissions);
    announce();

    return this.visibility.requireVisible(member, channelId);
  }

  async update(
    member: WorkspaceMember,
    channelId: string,
    dto: UpdateChannelDto,
  ): Promise<ChannelView> {
    const channel = await this.visibility.requireManageable(member, channelId);
    const changesNothing = dto.name === undefined && dto.categoryId === undefined;
    if (changesNothing) throw new BadRequestException('No changes provided');
    await this.requireCategory(member.workspaceId, dto.categoryId);

    const updated = await this.channels.update(member.workspaceId, channelId, dto);
    if (!updated) throw new NotFoundException('Channel not found');

    return { ...channel, ...updated };
  }

  async remove(member: WorkspaceMember, channelId: string): Promise<void> {
    const announce = await this.close(member, channelId);
    announce();
  }

  // The channel, its lists and everyone they reach commit together, or none of them do.
  @Transactional()
  private async open(
    creator: WorkspaceMember,
    dto: CreateChannelDto,
    permissions: ChannelPermissions,
  ): Promise<OpenedChannel> {
    await this.requireCategory(creator.workspaceId, dto.categoryId);

    const channel = await this.channels.create(creator.workspaceId, creator.id, {
      name: dto.name,
      categoryId: dto.categoryId ?? null,
    });
    const announce = await this.permissions.assign(creator.workspaceId, channel.id, permissions);

    return { channelId: channel.id, announce };
  }

  // Everyone in the channel learns it is gone, so their sidebars and open pages let go of it.
  @Transactional()
  private async close(member: WorkspaceMember, channelId: string): Promise<AnnounceAccessChanges> {
    await this.visibility.requireManageable(member, channelId);

    const announce = await this.permissions.close(member.workspaceId, channelId);
    const removed = await this.channels.remove(member.workspaceId, channelId);
    if (!removed) throw new NotFoundException('Channel not found');

    return announce;
  }

  // The creator always manages what they open; they can step back afterwards.
  private withCreatorManaging(
    permissions: ChannelPermissions,
    creator: WorkspaceMember,
  ): ChannelPermissions {
    const managesAlready = permissions.manage.some(
      (principal) => principal.kind === 'member' && principal.memberId === creator.id,
    );
    if (managesAlready) return permissions;

    return {
      ...permissions,
      manage: [...permissions.manage, { kind: 'member', memberId: creator.id }],
    };
  }

  private async requireCategory(workspaceId: string, categoryId?: string | null): Promise<void> {
    if (!categoryId) return;

    const category = await this.categories.findById(workspaceId, categoryId);
    if (!category) throw new NotFoundException('Category not found');
  }
}
