import type { ChannelTarget } from './channels/notification-channel';
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
/** Points at a range of messages, never their content, so a queued job holds no message text. */
export interface ConversationAlert extends PushScope {
  id: string;
  userId: string;
  memberId: string;
  expiresAt: string;
}
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
  target: ChannelTarget;
}

export interface NativePushReceiptJob {
  receiptId: string;
  deviceId: string;
  tokenFingerprint: string;
}

export interface MessageFanoutJob {
  source: MessageNotificationSource;
  after?: string;
}

export const PUSH_FANOUT_QUEUE = 'push.message-fanout';
export const PUSH_ALERT_DUE_QUEUE = 'push.batch-ready';
export const PUSH_EXPO_DELIVERY_QUEUE = 'push.expo-delivery';
export const PUSH_WEB_DELIVERY_QUEUE = 'push.web-delivery';
export const EXPO_RECEIPT_QUEUE = 'push.expo-receipt';
