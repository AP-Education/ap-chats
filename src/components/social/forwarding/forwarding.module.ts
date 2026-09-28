import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access/channel-access.module';
import { ChannelAudienceModule } from '@/components/communities/channel-audience/channel-audience.module';
import { DirectMessagesModule } from '@/components/direct-messages/direct-messages.module';
import { WorkspacesModule } from '@/components/workspaces';

import { MessagesModule } from '../messages/messages.module';
import { ForwardingController } from './forwarding.controller';
import { ForwardingFacade } from './forwarding.facade';
import { ForwardingGateway } from './forwarding.gateway';
import { DrizzleForwardingRepository } from './repository/drizzle-forwarding.repository';
import { ForwardingRepository } from './repository/forwarding.repository';

@Module({
  imports: [
    AuthModule,
    ChannelAccessModule,
    ChannelAudienceModule,
    DirectMessagesModule,
    WorkspacesModule,
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
