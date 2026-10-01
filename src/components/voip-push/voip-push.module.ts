import { Module } from '@nestjs/common';

import { DevicesModule } from '@/components/devices';

import { CallPushListener } from './call-push.listener';
import { ApnsVoipPushProvider, FcmPushProvider, PushProviderRegistry } from './provider';

@Module({
  imports: [DevicesModule],
  providers: [ApnsVoipPushProvider, FcmPushProvider, PushProviderRegistry, CallPushListener],
})
export class VoipPushModule {}
