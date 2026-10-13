import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { DirectMessagesModule } from '@/components/direct-messages/direct-messages.module';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { MessagesModule } from '../messages';
import { ForwardingController } from './forwarding.controller';
import { ForwardingFacade } from './forwarding.facade';
import { ForwardingGateway } from './forwarding.gateway';
import { DrizzleForwardingRepository } from './repository/drizzle-forwarding.repository';
import { ForwardingRepository } from './repository/forwarding.repository';

@Module({
  imports: [
    AuthModule,
    ChannelAccessPolicyModule,
    ChannelAudienceModule,
    DirectMessagesModule,
    WorkspaceMembersModule,
    MessagesModule,
  ],
  controllers: [ForwardingController],
  providers: [
    ForwardingFacade,
    ForwardingGateway,
    { provide: ForwardingRepository, useClass: DrizzleForwardingRepository },
  ],
  exports: [ForwardingFacade],
})
export class ForwardingModule {}
