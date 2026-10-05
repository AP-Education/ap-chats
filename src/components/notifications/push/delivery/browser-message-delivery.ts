import { Injectable } from '@nestjs/common';

import { BrowserPushTargetsStrategy, type PushTargetReference } from '@/components/devices';

import { WebPushProvider } from '../provider/web-push.provider';
import { type MessageNotificationPayload, PUSH_WEB_DELIVERY_EVENT } from '../types';
import { MessagePushDelivery } from './message-push-delivery';

@Injectable()
export class BrowserMessageDelivery extends MessagePushDelivery {
  readonly queueName = PUSH_WEB_DELIVERY_EVENT;
  readonly rateLimit = { max: 100, duration: 1000 };

  constructor(
    private readonly targets: BrowserPushTargetsStrategy,
    private readonly provider: WebPushProvider,
  ) {
    super();
  }

  get enabled(): boolean {
    return this.provider.enabled;
  }

  async send(
    target: PushTargetReference,
    notification: MessageNotificationPayload,
    ttl: number,
  ): Promise<void> {
    if (!this.enabled) return;

    const subscription = await this.targets.findCurrentSubscription(target, notification.userId);
    if (!subscription) return;
    if (subscription.activeUntil && subscription.activeUntil > new Date()) return;

    const status = await this.provider.send(subscription, notification, ttl);
    if (status === 'unregistered') {
      await this.targets.invalidateSubscriptionIfCurrent(subscription);
    }
  }
}
