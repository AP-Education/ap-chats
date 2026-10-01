import { Injectable } from '@nestjs/common';

import type { Platform } from '@/database/drizzle/schema';

import { ApnsVoipPushProvider } from './apns-voip.provider';
import type { CallPushProvider } from './call-push-provider.types';
import { FcmPushProvider } from './fcm.provider';

// The one place that knows which provider handles which platform, so neither
// CallPushListener nor a future caller has to.
@Injectable()
export class PushProviderRegistry {
  private readonly byPlatform: Record<Platform, CallPushProvider>;

  constructor(apns: ApnsVoipPushProvider, fcm: FcmPushProvider) {
    this.byPlatform = { ios: apns, android: fcm };
  }

  resolve(platform: Platform): CallPushProvider {
    return this.byPlatform[platform];
  }

  get isAnyConfigured(): boolean {
    return Object.values(this.byPlatform).some((provider) => provider.isConfigured);
  }
}
