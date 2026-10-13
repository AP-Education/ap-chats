import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { EntriesModule } from '@/components/social/entries/entries.module';
import { VoipPushModule } from '@/components/voip-push';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { CallsService } from './calls.service';
import { CallsHistoryController } from './calls-history.controller';
import { AiNativeCallProvider, CallProvider, LiveKitCallProvider } from './provider';
import { CallsRepository, DrizzleCallsRepository } from './repository';

@Module({
  imports: [
    AuthModule,
    ChannelAccessPolicyModule,
    ChannelAudienceModule,
    EntriesModule,
    VoipPushModule,
    WorkspaceMembersModule,
  ],
  controllers: [CallsController, CallsHistoryController],
  providers: [
    CallsService,
    CallsGateway,
    AiNativeCallProvider,
    LiveKitCallProvider,
    {
      provide: CallProvider,
      inject: [AiNativeCallProvider, LiveKitCallProvider],
      useFactory: (aiNative: AiNativeCallProvider, livekit: LiveKitCallProvider) =>
        aiNative.isConfigured ? aiNative : livekit,
    },
    { provide: CallsRepository, useClass: DrizzleCallsRepository },
  ],
  exports: [CallsService],
})
export class CallsModule {}
