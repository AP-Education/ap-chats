import { Module } from '@nestjs/common';

import { DevicesModule } from '@/components/devices';

import { CallPushWorker } from './call-push.worker';
import { ApnsVoipPushProvider, CallPushProviderRegistry, FcmPushProvider } from './provider';
import { CallPushRepository } from './repository/call-push.repository';
import { DrizzleCallPushRepository } from './repository/drizzle-call-push.repository';

@Module({
  imports: [DevicesModule],
  providers: [
    { provide: CallPushRepository, useClass: DrizzleCallPushRepository },
    ApnsVoipPushProvider,
    FcmPushProvider,
    CallPushProviderRegistry,
    CallPushWorker,
  ],
})
export class VoipPushModule {}
