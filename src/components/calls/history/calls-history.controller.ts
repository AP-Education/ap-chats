import { Controller, Get, Query } from '@nestjs/common';

import { type AuthenticatedUser, CurrentUser, UseAuthGuards } from '@/components/auth';

import { CallsHistoryService } from './calls-history.service';
import { CallsHistoryQueryDto } from './dto/calls-history-query.dto';

@Controller('calls')
@UseAuthGuards()
export class CallsHistoryController {
  constructor(private readonly history: CallsHistoryService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: CallsHistoryQueryDto) {
    return this.history.list(user.sub, query);
  }
}
