import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { type AnnounceAccessChanges, isAdministrator } from '@/components/workspaces/access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CommunityAccessService } from '../channel-access/community-access.service';
import { toChannelPermissions } from '../channel-access/permissions/dto/channel-permissions.dto';
import { ChannelPermissionsRepository } from '../channel-access/permissions/repository/channel-permissions.repository';
import type { ChannelPermissions } from '../channel-access/permissions/types';
import { ChannelAccessSync } from '../channel-access/sync/channel-access.sync';
import { ChannelCategoriesRepository } from '../channel-categories/repository';
import { channelView } from './channel.view';
import type { CreateChannelDto } from './dto/create-channel.dto';
import type { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelsRepository } from './repository';
import type { ChannelView } from './types';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly channels: ChannelsRepository,
    private readonly categories: ChannelCategoriesRepository,
    private readonly access: CommunityAccessService,
    private readonly permissions: ChannelPermissionsRepository,
    private readonly sync: ChannelAccessSync,
  ) {}

  async list(member: WorkspaceMember, scope: 'mine' | 'all'): Promise<ChannelView[]> {
    if (scope === 'all') this.requireAdministrator(member);

    const channels =
      scope === 'all'
        ? await this.channels.findAllAsSeenBy(member.workspaceId, member.id)
        : await this.channels.findListedFor(member.workspaceId, member.id);

    return channels.map((channel) => channelView(member, channel));
  }

  get(member: WorkspaceMember, channelId: string): Promise<ChannelView> {
    return this.access.requireVisibleChannel(member, channelId);
  }

  async create(member: WorkspaceMember, dto: CreateChannelDto): Promise<ChannelView> {
    this.requireAdministrator(member);
    const name = this.normalizeName(dto.name);
    await this.requireCategory(member.workspaceId, dto.categoryId);

    const permissions = this.withCreatorManaging(toChannelPermissions(dto.permissions), member);
    const { channelId, announce } = await this.open(member, {
      name,
      categoryId: dto.categoryId ?? null,
      permissions,
    });
    announce();

    return this.access.requireVisibleChannel(member, channelId);
  }

  async update(
    member: WorkspaceMember,
    channelId: string,
    dto: UpdateChannelDto,
  ): Promise<ChannelView> {
    await this.access.requireManageableChannel(member, channelId);
    if (dto.name === undefined && dto.categoryId === undefined)
      throw new BadRequestException('No changes provided');

    const name = dto.name === undefined ? undefined : this.normalizeName(dto.name);
    if (dto.categoryId) await this.requireCategory(member.workspaceId, dto.categoryId);

    const updated = await this.channels.update(member.workspaceId, channelId, {
      ...(name === undefined ? {} : { name }),
      ...(dto.categoryId === undefined ? {} : { categoryId: dto.categoryId }),
    });
    if (!updated) throw new NotFoundException('Channel not found');

    return this.access.requireVisibleChannel(member, channelId);
  }

  async remove(member: WorkspaceMember, channelId: string): Promise<void> {
    await this.access.requireManageableChannel(member, channelId);

    const removed = await this.channels.remove(member.workspaceId, channelId);
    if (!removed) throw new NotFoundException('Channel not found');
  }

  @Transactional()
  private async open(
    creator: WorkspaceMember,
    values: { name: string; categoryId: string | null; permissions: ChannelPermissions },
  ): Promise<{ channelId: string; announce: AnnounceAccessChanges }> {
    const { permissions, ...details } = values;
    const channel = await this.channels.create(creator.workspaceId, creator.id, details);

    await this.permissions.replace(creator.workspaceId, channel.id, permissions);
    const announce = await this.sync.refreshChannel(creator.workspaceId, channel.id);

    return { channelId: channel.id, announce };
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

  private requireAdministrator(member: WorkspaceMember): void {
    if (!isAdministrator(member))
      throw new ForbiddenException('Only workspace managers can do this');
  }

  private normalizeName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Channel name cannot be blank');
    return trimmed;
  }

  private async requireCategory(workspaceId: string, categoryId?: string): Promise<void> {
    if (!categoryId) return;
    const category = await this.categories.findById(workspaceId, categoryId);
    if (!category) throw new NotFoundException('Category not found');
  }
}
