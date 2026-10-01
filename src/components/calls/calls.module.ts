import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access/channel-access.module';
import { ChannelAudienceModule } from '@/components/communities/channel-audience/channel-audience.module';
import { EntriesModule } from '@/components/social/entries/entries.module';
import { VoipPushModule } from '@/components/voip-push';
import { WorkspacesModule } from '@/components/workspaces';

import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { CallsService } from './calls.service';
import { CallsHistoryController } from './calls-history.controller';
import { CallProvider, LiveKitCallProvider } from './provider';
import { CallsRepository, DrizzleCallsRepository } from './repository';

@Module({
  imports: [
    AuthModule,
    ChannelAccessModule,
    ChannelAudienceModule,
    EntriesModule,
    VoipPushModule,
    WorkspacesModule,
  ],
  controllers: [CallsController, CallsHistoryController],
  providers: [
    CallsService,
    CallsGateway,
    { provide: CallProvider, useClass: LiveKitCallProvider },
    { provide: CallsRepository, useClass: DrizzleCallsRepository },
  ],
  exports: [CallsService],
})
export class CallsModule {}
