import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { DirectConversationsModule } from '@/components/direct-messages/conversations';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { MessagesModule } from '../messages';
import { ForwardingController } from './forwarding.controller';
import { ForwardingService } from './forwarding.service';

@Module({
  imports: [
    AuthModule,
    WorkspaceMembersModule,
    ChannelAccessPolicyModule,
    DirectConversationsModule,
    MessagesModule,
  ],
  controllers: [ForwardingController],
  providers: [ForwardingService],
})
export class ForwardingModule {}
