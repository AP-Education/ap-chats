import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';

import { validatePushSubscription } from './push-endpoint';
import { WebPushRepository } from './repository/web-push.repository';
import type { WebPushPresence, WebPushRegistration } from './web-push.types';

@Injectable()
export class WebPushService {
  constructor(
    private readonly repository: WebPushRepository,
    private readonly config: AppConfigService,
  ) {}

  configuration() {
    return {
      publicKey: this.config.get('PUSH_ENABLED')
        ? (this.config.get('WEB_PUSH_PUBLIC_KEY') ?? null)
        : null,
    };
  }

  register(userId: string, subscription: WebPushRegistration) {
    if (!this.configuration().publicKey)
      throw new ServiceUnavailableException('Web push is not configured');
    validatePushSubscription(
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
    );

    return this.repository.register(userId, subscription);
  }

  remove(userId: string, id: string) {
    return this.repository.remove(userId, id);
  }

  presence(userId: string, id: string, presence: WebPushPresence) {
    return this.repository.presence(userId, id, presence);
  }
}
