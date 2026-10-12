import { BadRequestException, Controller, Get, Query } from '@nestjs/common';

import { type AuthenticatedUser, CurrentUser, UseAuthGuards } from '@/components/auth';

import { CallsService } from './calls.service';

@Controller('calls')
@UseAuthGuards()
export class CallsHistoryController {
  constructor(private readonly calls: CallsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('filter') filter?: string,
    @Query('before') before?: string,
  ) {
    if (filter && filter !== 'all' && filter !== 'missed') {
      throw new BadRequestException('Invalid calls filter');
    }

    return this.calls.list(user.sub, filter === 'missed' ? 'missed' : 'all', before);
  }
}
