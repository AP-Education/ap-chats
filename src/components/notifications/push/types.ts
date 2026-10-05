import type { PushTargetReference } from '@/components/devices';

import type { PushScope } from './repository/push-audience.repository';

export interface MessageNotificationSource extends PushScope {
  actorMemberId: string;
}

export interface MessageNotificationPayload {
  eventId: string;
  userId: string;
  workspaceId: string;
  channelId: string;
  url: string;
  title: string;
  body: string;
}
/** Immutable references for one admitted conversation alert; content stays in messages. */
export interface ConversationAlert extends PushScope {
  id: string;
  userId: string;
  memberId: string;
  expiresAt: string;
}
/** A reservation for cooldown, per-user budget and retry identity, not a collection state machine. */
export interface NotificationWindow {
  id: string;
  userId: string;
  channelId: string;
  firstSeq: bigint;
  lastSeq: bigint;
  expiresAt: Date;
  createdAt: Date;
}

export interface MessageDeliveryJob {
  alert: ConversationAlert;
  target: PushTargetReference;
}

export interface NativePushReceiptJob {
  receiptId: string;
  deviceId: string;
  tokenFingerprint: string;
  expiresAt: string;
}

export interface MessageFanoutJob {
  source: MessageNotificationSource;
  after?: string;
}

export const PUSH_FANOUT_EVENT = 'push.message-fanout';
export const PUSH_BATCH_READY_EVENT = 'push.batch-ready';
export const PUSH_EXPO_DELIVERY_EVENT = 'push.expo-delivery';
export const PUSH_WEB_DELIVERY_EVENT = 'push.web-delivery';
export const EXPO_RECEIPT_EVENT = 'push.expo-receipt';
