import type { WebPushSubscription } from '@/components/devices/browser/web-push.types';

import type { MessageNotificationPayload } from '../types';

export abstract class WebPushProvider {
  abstract readonly enabled: boolean;
  abstract send(
    subscription: WebPushSubscription,
    envelope: MessageNotificationPayload,
    ttl: number,
  ): Promise<'accepted' | 'unregistered'>;
}
