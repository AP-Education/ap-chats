import { Injectable } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';

import { AppConfigService } from '@/globals/config';

import type { MessageNotificationPayload } from '../types';
import {
  type ExpoPushAcceptance,
  ExpoPushProvider,
  type ExpoPushReceipt,
} from './expo-push.provider';

@Injectable()
export class ExpoServerPushProvider extends ExpoPushProvider {
  private readonly client: Expo;

  constructor(config: AppConfigService) {
    super();
    const accessToken = config.get('EXPO_ACCESS_TOKEN');
    this.client = new Expo(accessToken ? { accessToken } : {});
  }

  async send(
    token: string,
    envelope: MessageNotificationPayload,
    ttl: number,
  ): Promise<ExpoPushAcceptance> {
    if (!Expo.isExpoPushToken(token)) throw new Error('Invalid Expo push token');
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
    if (ticket.status === 'ok') return { status: 'accepted', receiptId: ticket.id };
    if (ticket.details?.error === 'DeviceNotRegistered') return { status: 'unregistered' };
    throw new Error(`Expo rejected notification: ${ticket.details?.error ?? 'unknown'}`);
  }

  async receipt(id: string): Promise<ExpoPushReceipt> {
    const receipt = (await this.client.getPushNotificationReceiptsAsync([id]))[id];
    if (!receipt) return 'pending';
    if (receipt.status === 'ok') return 'accepted';
    if (receipt.details?.error === 'DeviceNotRegistered') return 'unregistered';
    throw new Error(`Expo receipt rejected: ${receipt.details?.error ?? 'unknown'}`);
  }
}
