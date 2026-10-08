import { Injectable } from '@nestjs/common';

import { BrowserPushTargetsStrategy } from '@/components/devices';

import { type NotificationPayload, PUSH_WEB_DELIVERY_QUEUE } from '../types';
import { type ChannelTarget, NotificationChannel } from './notification-channel';
import { WebPushClient } from './web-push.client';

@Injectable()
export class BrowserChannel extends NotificationChannel {
  readonly kind = 'web';
  readonly delivery = { queue: PUSH_WEB_DELIVERY_QUEUE, rateLimit: { max: 100, duration: 1000 } };

  constructor(
    private readonly subscriptions: BrowserPushTargetsStrategy,
    private readonly client: WebPushClient,
  ) {
    super();
  }

  get enabled(): boolean {
    return this.client.configured;
  }

  async listTargets(userId: string): Promise<ChannelTarget[]> {
    const targets = await this.subscriptions.listMessageTargetsForUser(userId);

    return targets.map((target) => ({ channel: this.kind, ...target }));
  }

  async send(target: ChannelTarget, notification: NotificationPayload, ttl: number): Promise<void> {
    const subscription = await this.subscriptions.findCurrentSubscription(
      target,
      notification.userId,
    );
    if (!subscription) return;

    const status = await this.client.send(subscription, notification, ttl);
    if (status === 'unregistered')
      await this.subscriptions.invalidateSubscriptionIfCurrent(subscription);
  }
}
