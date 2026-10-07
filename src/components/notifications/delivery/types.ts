import type { ChannelTarget } from './channels/notification-channel';

/** A run of messages in one conversation, addressed by position, never by content. */
export interface ConversationRange {
  workspaceId: string;
  channelId: string;
  firstSeq: string;
  lastSeq: string;
}

/** One person to alert about a conversation range; a queued job holds no message text. */
export interface ConversationAlert extends ConversationRange {
  id: string;
  userId: string;
  memberId: string;
  expiresAt: string;
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

export const PUSH_ALERT_DUE_QUEUE = 'push.batch-ready';
export const PUSH_EXPO_DELIVERY_QUEUE = 'push.expo-delivery';
export const PUSH_WEB_DELIVERY_QUEUE = 'push.web-delivery';
export const EXPO_RECEIPT_QUEUE = 'push.expo-receipt';
