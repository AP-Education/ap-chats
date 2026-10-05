import type { MessageNotificationPayload } from '../types';

export type ExpoPushAcceptance =
  { status: 'accepted'; receiptId: string } | { status: 'unregistered' };
export type ExpoPushReceipt = 'pending' | 'accepted' | 'unregistered';

export abstract class ExpoPushProvider {
  abstract send(
    token: string,
    envelope: MessageNotificationPayload,
    ttl: number,
  ): Promise<ExpoPushAcceptance>;
  abstract receipt(id: string): Promise<ExpoPushReceipt>;
}
