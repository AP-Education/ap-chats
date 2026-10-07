import { Injectable } from '@nestjs/common';
import webpush from 'web-push';

import type { WebPushSubscription } from '@/components/devices/browser/web-push.types';
import { AppConfigService } from '@/globals/config';

import type { MessageNotificationPayload } from '../types';

@Injectable()
export class WebPushClient {
  constructor(private readonly config: AppConfigService) {}

  get configured(): boolean {
    return Boolean(this.config.get('WEB_PUSH_PUBLIC_KEY'));
  }

  async send(
    subscription: WebPushSubscription,
    envelope: MessageNotificationPayload,
    ttl: number,
  ): Promise<'accepted' | 'unregistered'> {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(envelope),
        {
          TTL: ttl,
          timeout: 10000,
          urgency: 'normal',
          topic: envelope.channelId.replaceAll('-', ''),
          vapidDetails: {
            subject: this.config.get('WEB_PUSH_SUBJECT')!,
            publicKey: this.config.get('WEB_PUSH_PUBLIC_KEY')!,
            privateKey: this.config.get('WEB_PUSH_PRIVATE_KEY')!,
          },
        },
      );
      return 'accepted';
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
      if (status === 404 || status === 410) return 'unregistered';
      throw error;
    }
  }
}
