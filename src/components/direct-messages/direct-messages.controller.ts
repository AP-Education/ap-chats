import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { type AuthenticatedUser, CurrentUser, UseAuthGuards } from '@/components/auth';

import { DirectMessagesService } from './direct-messages.service';

@Controller('direct-messages')
@UseAuthGuards()
export class DirectMessagesController {
  constructor(private readonly directMessages: DirectMessagesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('before') before?: string) {
    return this.directMessages.list(user.sub, before);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthenticatedUser) {
    return this.directMessages.unread(user.sub);
  }

  @Get(':channelId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.directMessages.get(user.sub, channelId);
  }
}
