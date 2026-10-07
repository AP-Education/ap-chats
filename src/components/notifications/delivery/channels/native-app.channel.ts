import { Injectable } from '@nestjs/common';

import { NativePushTargetsStrategy } from '@/components/devices';

import { type NotificationPayload, PUSH_EXPO_DELIVERY_QUEUE } from '../types';
import { ExpoPushClient } from './expo-push.client';
import { type ChannelTarget, NotificationChannel } from './notification-channel';

@Injectable()
export class NativeAppChannel extends NotificationChannel {
  readonly kind = 'expo';
  readonly enabled = true;
  readonly delivery = { queue: PUSH_EXPO_DELIVERY_QUEUE, rateLimit: { max: 500, duration: 1000 } };

  constructor(
    private readonly devices: NativePushTargetsStrategy,
    private readonly client: ExpoPushClient,
  ) {
    super();
  }

  async listTargets(userId: string): Promise<ChannelTarget[]> {
    const targets = await this.devices.listMessageTargetsForUser(userId);

    return targets.map((target) => ({ channel: this.kind, ...target }));
  }

  async send(target: ChannelTarget, notification: NotificationPayload, ttl: number): Promise<void> {
    const device = await this.devices.findCurrentDevice(target, notification.userId, 'push');
    if (!device?.pushToken) return;

    // A stale token that Expo only reports later in a receipt is replaced when the app re-registers.
    const status = await this.client.send(device.pushToken, notification, ttl);
    if (status === 'unregistered') await this.devices.invalidateTokenIfCurrent(device, 'push');
  }
}
