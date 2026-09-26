import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelCategoriesRepository } from '../channel-categories/repository';
import { CommunityAccessService } from '../community-access.service';
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
    return { ...channel, isMember: await this.access.isChannelMember(channelId, member.id) };
  }

  async create(member: WorkspaceMember, dto: CreateChannelDto): Promise<ChannelView> {
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
    await this.access.requireManager(channel, member);
    if (channel.archivedAt) throw new ConflictException('Archived channel cannot be changed');
    if (dto.name === undefined && dto.categoryId === undefined)
      throw new BadRequestException('No changes provided');
    const name = dto.name === undefined ? undefined : this.normalizeName(dto.name);
    if (dto.categoryId) await this.requireCategory(member.workspaceId, dto.categoryId);
    const updated = await this.channels.update(member.workspaceId, channelId, {
      ...(name === undefined ? {} : { name }),
      ...(dto.categoryId === undefined ? {} : { categoryId: dto.categoryId }),
    });
    if (!updated) throw new NotFoundException('Channel not found or archived');
    return { ...updated, isMember: await this.access.isChannelMember(channelId, member.id) };
  }

  async setArchived(
    member: WorkspaceMember,
    channelId: string,
    archived: boolean,
  ): Promise<ChannelView> {
    const channel = await this.access.requireVisibleChannel(
      member.workspaceId,
      channelId,
      member.id,
    );
    await this.access.requireManager(channel, member);
    const updated = await this.channels.setArchived(member.workspaceId, channelId, archived);
    if (!updated) throw new NotFoundException('Channel not found');
    return { ...updated, isMember: await this.access.isChannelMember(channelId, member.id) };
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
