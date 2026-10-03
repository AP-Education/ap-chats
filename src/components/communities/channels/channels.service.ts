import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CommunityAccessService } from '../channel-access/community-access.service';
import { ChannelCategoriesRepository } from '../channel-categories/repository';
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
  ) {}

  list(member: WorkspaceMember, scope: 'available' | 'joined'): Promise<ChannelView[]> {
    return this.channels.findAllForMember(member.workspaceId, member.id, scope);
  }

  async get(member: WorkspaceMember, channelId: string): Promise<ChannelView> {
    const channel = await this.access.requireVisibleChannel(
      member.workspaceId,
      channelId,
      member.id,
    );
    if (channel.kind === 'dm') throw new NotFoundException('Channel not found');
    return { ...channel, isMember: await this.access.isChannelMember(channelId, member.id) };
  }

  async create(member: WorkspaceMember, dto: CreateChannelDto): Promise<ChannelView> {
    if (member.role !== 'owner')
      throw new ForbiddenException('Only the workspace owner can create channels');
    const name = this.normalizeName(dto.name);
    await this.requireCategory(member.workspaceId, dto.categoryId);
    const channel = await this.channels.create(member.workspaceId, member.id, {
      name,
      kind: dto.kind,
      categoryId: dto.categoryId ?? null,
    });
    return { ...channel, isMember: true };
  }

  async update(
    member: WorkspaceMember,
    channelId: string,
    dto: UpdateChannelDto,
  ): Promise<ChannelView> {
    const channel = await this.access.requireVisibleChannel(
      member.workspaceId,
      channelId,
      member.id,
    );
    if (channel.kind === 'dm') throw new NotFoundException('Channel not found');
    await this.access.requireManager(channel, member);
    if (dto.name === undefined && dto.categoryId === undefined)
      throw new BadRequestException('No changes provided');
    const name = dto.name === undefined ? undefined : this.normalizeName(dto.name);
    if (dto.categoryId) await this.requireCategory(member.workspaceId, dto.categoryId);
    const updated = await this.channels.update(member.workspaceId, channelId, {
      ...(name === undefined ? {} : { name }),
      ...(dto.categoryId === undefined ? {} : { categoryId: dto.categoryId }),
    });
    if (!updated) throw new NotFoundException('Channel not found');
    return { ...updated, isMember: await this.access.isChannelMember(channelId, member.id) };
  }

  async remove(member: WorkspaceMember, channelId: string): Promise<void> {
    const channel = await this.access.requireVisibleChannel(
      member.workspaceId,
      channelId,
      member.id,
    );
    if (channel.kind === 'dm') throw new NotFoundException('Channel not found');
    await this.access.requireManager(channel, member);
    const removed = await this.channels.remove(member.workspaceId, channelId);
    if (!removed) throw new NotFoundException('Channel not found');
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
