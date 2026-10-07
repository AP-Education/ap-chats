import { Injectable } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';

import { AppConfigService } from '@/globals/config';
import { PermanentJobError } from '@/globals/jobs/job-queue';

import type { MessageNotificationPayload } from '../types';

@Injectable()
export class ExpoPushClient {
  private readonly client: Expo;

  constructor(config: AppConfigService) {
    const accessToken = config.get('EXPO_ACCESS_TOKEN');
    this.client = new Expo(accessToken ? { accessToken } : {});
  }

  async send(
    token: string,
    envelope: MessageNotificationPayload,
    ttl: number,
  ): Promise<'accepted' | 'unregistered'> {
    // A malformed token never becomes valid, so it is dropped like an unregistered one.
    if (!Expo.isExpoPushToken(token)) return 'unregistered';

    const [ticket] = await this.client.sendPushNotificationsAsync([
      {
        to: token,
        title: envelope.title,
        body: envelope.body,
        sound: 'default',
        channelId: 'messages',
        ttl,
        data: {
          eventId: envelope.eventId,
          userId: envelope.userId,
          workspaceId: envelope.workspaceId,
          channelId: envelope.channelId,
          url: envelope.url,
        },
        collapseId: envelope.channelId,
        threadId: envelope.channelId,
        tag: envelope.channelId,
      },
    ]);
    if (!ticket) throw new Error('Expo returned no push ticket');
    if (ticket.status === 'ok') return 'accepted';

    return unregisteredOrThrow(ticket.details?.error, 'Expo rejected notification');
  }
}

// Errors a retry can't fix; anything else (rate limits, outages) is left to job retries.
const PERMANENT_ERRORS = new Set(['MessageTooBig', 'InvalidCredentials', 'MismatchSenderId']);

function unregisteredOrThrow(error: string | undefined, context: string): 'unregistered' {
  if (error === 'DeviceNotRegistered') return 'unregistered';

  const message = `${context}: ${error ?? 'unknown'}`;
  throw PERMANENT_ERRORS.has(error ?? '') ? new PermanentJobError(message) : new Error(message);
}
