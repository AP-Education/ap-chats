import { Injectable } from '@nestjs/common';

import { BrowserPushTargetsStrategy } from '@/components/devices';

import { type MessageNotificationPayload, PUSH_WEB_DELIVERY_QUEUE } from '../types';
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

  async send(
    target: ChannelTarget,
    notification: MessageNotificationPayload,
    ttl: number,
  ): Promise<void> {
    const subscription = await this.subscriptions.findCurrentSubscription(
      target,
      notification.userId,
    );
    if (!subscription) return;

    // The person is looking at the app right now; its own realtime path already told them.
    const isActive = subscription.activeUntil && subscription.activeUntil > new Date();
    if (isActive) return;

    const status = await this.client.send(subscription, notification, ttl);
    if (status === 'unregistered')
      await this.subscriptions.invalidateSubscriptionIfCurrent(subscription);
  }
}
