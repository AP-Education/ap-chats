import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { type AuthenticatedUser, CurrentUser, UseAuthGuards } from '@/components/auth';

import { DirectInboxService } from './direct-inbox.service';
import { ListConversationsDto } from './dto/list-conversations.dto';

@Controller('direct-messages')
@UseAuthGuards()
export class DirectMessagesController {
  constructor(private readonly inbox: DirectInboxService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListConversationsDto) {
    return this.inbox.list(user.sub, query.before);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthenticatedUser) {
    return this.inbox.unread(user.sub);
  }

  @Get(':channelId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.inbox.get(user.sub, channelId);
  }
}
