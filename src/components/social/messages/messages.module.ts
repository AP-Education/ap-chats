import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { EntriesModule } from '../entries/entries.module';
import { MentionsModule } from '../mentions';
import { PinsModule } from '../pins/pins.module';
import { ChatUploadsModule } from './attachments';
import { MessageMarkdownService } from './content/message-markdown';
import { MessagesController } from './messages.controller';
import { MessagesFacade } from './messages.facade';
import { MessagesGateway } from './messages.gateway';
import { DrizzleMessagesRepository } from './repository/drizzle-messages.repository';
import { MessagesRepository } from './repository/messages.repository';

@Module({
  imports: [
    AuthModule,
    ChannelAccessPolicyModule,
    ChannelAudienceModule,
    WorkspaceMembersModule,
    EntriesModule,
    MentionsModule,
    PinsModule,
    ChatUploadsModule,
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
