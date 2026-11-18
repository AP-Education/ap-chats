import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AppUpdateSummary, RollbackResult } from '../types';
import { AdminUpdatesService } from './admin-updates.service';
import {
  ListUpdatesQueryDto,
  PublishUpdateDto,
  RegisterRuntimeDto,
  RollbackUpdateDto,
  SetRolloutDto,
} from './dto';
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

  @Patch('releases/:id/rollout')
  @HttpCode(204)
  setRollout(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRolloutDto): Promise<void> {
    return this.admin.setRollout(id, dto.percent, dto.resume);
  }

  @Post('releases/:id/pause')
  @HttpCode(204)
  pause(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.admin.pause(id);
  }

  @Post('releases/:id/rollback')
  rollback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RollbackUpdateDto,
  ): Promise<RollbackResult> {
    return this.admin.rollback(id, dto.embedded);
  }
}
