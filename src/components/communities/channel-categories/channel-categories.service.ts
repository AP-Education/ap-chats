import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { isAdministrator } from '@/components/workspaces/access';
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

  create(member: WorkspaceMember, dto: CreateChannelCategoryDto): Promise<ChannelCategory> {
    this.requireAdministrator(member);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Category name cannot be blank');
    return this.categories.create(member.workspaceId, name, dto.position ?? 0);
  }

  async update(
    member: WorkspaceMember,
    categoryId: string,
    dto: UpdateChannelCategoryDto,
  ): Promise<ChannelCategory> {
    this.requireAdministrator(member);
    const name = dto.name?.trim();
    if (name === '') throw new BadRequestException('Category name cannot be blank');
    if (name === undefined && dto.position === undefined)
      throw new BadRequestException('No changes provided');
    const category = await this.categories.update(member.workspaceId, categoryId, {
      ...(name === undefined ? {} : { name }),
      ...(dto.position === undefined ? {} : { position: dto.position }),
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async delete(member: WorkspaceMember, categoryId: string): Promise<void> {
    this.requireAdministrator(member);
    if (!(await this.categories.delete(member.workspaceId, categoryId))) {
      throw new NotFoundException('Category not found');
    }
  }

  private requireAdministrator(member: WorkspaceMember): void {
    if (!isAdministrator(member))
      throw new ForbiddenException('Only workspace managers can manage categories');
  }
}
