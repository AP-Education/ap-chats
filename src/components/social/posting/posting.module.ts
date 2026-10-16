import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { AttachmentsModule } from '../attachments';
import { ContentModule } from '../content';
import { MessagesModule } from '../messages';
import { PinsModule } from '../pins';
import { DeleteMessagesService } from './delete-messages.service';
import { EditMessageService } from './edit-message.service';
import { MessageComposer } from './message-composer';
import { MessagesController } from './messages.controller';
import { SendMessageService } from './send-message.service';

@Module({
  imports: [
    AuthModule,
    WorkspaceMembersModule,
    ChannelAccessPolicyModule,
    ContentModule,
    MessagesModule,
    AttachmentsModule,
    PinsModule,
  ],
  controllers: [MessagesController],
  providers: [MessageComposer, SendMessageService, EditMessageService, DeleteMessagesService],
  exports: [MessageComposer, SendMessageService],
})
export class PostingModule {}
