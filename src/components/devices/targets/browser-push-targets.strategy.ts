import { Injectable } from '@nestjs/common';

import { WebPushRepository } from '../browser/repository/web-push.repository';
import type { WebPushSubscription } from '../browser/web-push.types';
import { subscriptionFingerprint } from './credential-fingerprint';
import type { DeviceTarget } from './types';

@Injectable()
export class BrowserPushTargetsStrategy {
  constructor(private readonly repository: WebPushRepository) {}

  async listMessageTargetsForUser(userId: string): Promise<DeviceTarget[]> {
    const subscriptions = await this.repository.forUser(userId);

    return subscriptions.map((subscription) => ({
      id: subscription.id,
      fingerprint: subscriptionFingerprint(subscription),
    }));
  }

  async findCurrentSubscription(
    target: DeviceTarget,
    userId: string,
  ): Promise<WebPushSubscription | undefined> {
    const subscription = await this.repository.find(target.id);
    if (!subscription || subscription.userId !== userId) return undefined;
    if (subscriptionFingerprint(subscription) !== target.fingerprint) return undefined;

    return subscription;
  }

  invalidateSubscriptionIfCurrent(subscription: WebPushSubscription): Promise<void> {
    return this.repository.invalidate(subscription);
  }
}
