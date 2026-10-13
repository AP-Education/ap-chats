import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { DirectConversationsModule } from '@/components/direct-messages/conversations';
import { WorkspacesModule } from '@/components/workspaces';

import { MessagesModule } from '../messages';
import { ForwardingController } from './forwarding.controller';
import { ForwardingService } from './forwarding.service';

@Module({
  imports: [
    AuthModule,
    WorkspacesModule,
    ChannelAccessModule,
    DirectConversationsModule,
    MessagesModule,
  ],
  controllers: [ForwardingController],
  providers: [ForwardingService],
})
export class ForwardingModule {}
