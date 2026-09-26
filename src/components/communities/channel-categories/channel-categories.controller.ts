import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelCategoriesService } from './channel-categories.service';
import { CreateChannelCategoryDto } from './dto/create-channel-category.dto';
import { UpdateChannelCategoryDto } from './dto/update-channel-category.dto';

@Controller('workspaces/:workspaceId/channel-categories')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChannelCategoriesController {
  constructor(private readonly categories: ChannelCategoriesService) {}

  @Get()
  list(@CurrentWorkspaceMember() member: WorkspaceMember) {
    return this.categories.list(member);
  }

  @Post()
  create(@CurrentWorkspaceMember() member: WorkspaceMember, @Body() dto: CreateChannelCategoryDto) {
    return this.categories.create(member, dto);
  }

  @Patch(':categoryId')
  update(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateChannelCategoryDto,
  ) {
    return this.categories.update(member, categoryId, dto);
  }

  @Delete(':categoryId')
  @HttpCode(204)
  delete(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<void> {
    return this.categories.delete(member, categoryId);
  }
}
