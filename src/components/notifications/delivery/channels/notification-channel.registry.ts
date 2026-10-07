import { Inject, Injectable } from '@nestjs/common';

import {
  type ChannelTarget,
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from './notification-channel';

@Injectable()
export class NotificationChannelRegistry {
  private readonly byKind: Map<string, NotificationChannel>;

  constructor(@Inject(NOTIFICATION_CHANNELS) readonly all: NotificationChannel[]) {
    this.byKind = new Map(all.map((channel) => [channel.kind, channel]));
  }

  async listTargets(userId: string): Promise<ChannelTarget[]> {
    const enabled = this.all.filter((channel) => channel.enabled);
    const targets = await Promise.all(enabled.map((channel) => channel.listTargets(userId)));

    return targets.flat();
  }

  resolve(kind: string): NotificationChannel {
    const channel = this.byKind.get(kind);
    if (!channel) throw new Error(`Unknown notification channel: ${kind}`);

    return channel;
  }
}
