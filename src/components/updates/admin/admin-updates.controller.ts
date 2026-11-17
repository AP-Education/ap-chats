import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';

import type { AppUpdateSummary } from '../types';
import { AdminUpdatesService } from './admin-updates.service';
import { ListUpdatesQueryDto, PublishUpdateDto, RegisterRuntimeDto } from './dto';
import { AdminTokenGuard } from './guards/admin-token.guard';

@Controller('updates/admin')
@UseGuards(AdminTokenGuard)
export class AdminUpdatesController {
  constructor(private readonly admin: AdminUpdatesService) {}

  @Post('runtimes')
  @HttpCode(204)
  registerRuntime(@Body() dto: RegisterRuntimeDto): Promise<void> {
    return this.admin.registerRuntime(dto);
  }

  @Post('releases')
  publish(@Body() dto: PublishUpdateDto): Promise<{ id: string }> {
    return this.admin.publish(dto);
  }

  @Get('releases')
  list(@Query() query: ListUpdatesQueryDto): Promise<AppUpdateSummary[]> {
    return this.admin.list(query);
  }
}
