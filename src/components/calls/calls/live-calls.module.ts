import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { EntriesModule } from '@/components/social/entries';
import { SocialRealtimeModule } from '@/components/social/realtime';
import { WorkspacesModule } from '@/components/workspaces';
import { RealtimeTransportModule } from '@/globals/realtime';

import { CallEventsRelay } from './call-events.relay';
import { CallLifecycle } from './call-lifecycle';
import { CallPlacement } from './call-placement';
import { CallSignals } from './call-signals';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { AiNativeCallProvider } from './provider/ai-native-call.provider';
import { CallProvider } from './provider/call.provider';
import { LiveKitCallProvider } from './provider/livekit-call.provider';
import { CallsRepository } from './repository/calls.repository';
import { DrizzleCallsRepository } from './repository/drizzle-calls.repository';

@Module({
  imports: [
    AuthModule,
    WorkspacesModule,
    ChannelAccessModule,
    EntriesModule,
    SocialRealtimeModule,
    RealtimeTransportModule,
  ],
  controllers: [CallsController],
  providers: [
    CallsService,
    CallPlacement,
    CallLifecycle,
    CallSignals,
    CallEventsRelay,
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
})
export class LiveCallsModule {}
