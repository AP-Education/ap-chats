import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access/channel-access.module';
import { ChannelAudienceModule } from '@/components/communities/channel-audience/channel-audience.module';
import { WorkspacesModule } from '@/components/workspaces';

import { EntriesModule } from '../entries/entries.module';
import { MentionsModule } from '../mentions/mentions.module';
import { PinsModule } from '../pins/pins.module';
import { MessageMarkdownService } from './content/message-markdown';
import { MessagesController } from './messages.controller';
import { MessagesFacade } from './messages.facade';
import { MessagesGateway } from './messages.gateway';
import { DrizzleMessagesRepository } from './repository/drizzle-messages.repository';
import { MessagesRepository } from './repository/messages.repository';

@Module({
  imports: [
    AuthModule,
    ChannelAccessModule,
    ChannelAudienceModule,
    WorkspacesModule,
    EntriesModule,
    MentionsModule,
    PinsModule,
  ],
  controllers: [MessagesController],
  providers: [
    MessagesFacade,
    { provide: MessagesRepository, useClass: DrizzleMessagesRepository },
    MessageMarkdownService,
    MessagesGateway,
  ],
  exports: [MessagesFacade],
})
export class MessagesModule {}
