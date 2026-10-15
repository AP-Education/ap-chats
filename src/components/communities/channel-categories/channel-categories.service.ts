import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { requireAccessLevel } from '@/components/workspaces/access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { CreateChannelCategoryDto } from './dto/create-channel-category.dto';
import type { UpdateChannelCategoryDto } from './dto/update-channel-category.dto';
import { ChannelCategoriesRepository } from './repository';
import type { ChannelCategory } from './types';

@Injectable()
export class ChannelCategoriesService {
  constructor(private readonly categories: ChannelCategoriesRepository) {}

  list(member: WorkspaceMember): Promise<ChannelCategory[]> {
    return this.categories.findAllForWorkspace(member.workspaceId);
  }

  async create(member: WorkspaceMember, dto: CreateChannelCategoryDto): Promise<ChannelCategory> {
    requireAccessLevel(member, 'manager');

    return this.categories.create(member.workspaceId, dto.name, dto.position ?? 0);
  }

  async update(
    member: WorkspaceMember,
    categoryId: string,
    dto: UpdateChannelCategoryDto,
  ): Promise<ChannelCategory> {
    requireAccessLevel(member, 'manager');
    const changesNothing = dto.name === undefined && dto.position === undefined;
    if (changesNothing) throw new BadRequestException('No changes provided');

    const category = await this.categories.update(member.workspaceId, categoryId, dto);
    if (!category) throw new NotFoundException('Category not found');

    return category;
  }

  async delete(member: WorkspaceMember, categoryId: string): Promise<void> {
    requireAccessLevel(member, 'manager');

    const deleted = await this.categories.delete(member.workspaceId, categoryId);
    if (!deleted) throw new NotFoundException('Category not found');
  }
}
