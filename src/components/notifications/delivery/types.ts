import type { ChannelTarget } from './channels/notification-channel';

/** One person to reach. Requester fields ride along untouched and come back to `render`. */
export interface NotificationRequest {
  id: string;
  userId: string;
  expiresAt: string;
}

/** What a tap opens. Only clients read it; delivery passes it through. */
export type NotificationTarget = { type: string } & Record<string, string>;

export interface NotificationPayload {
  eventId: string;
  userId: string;
  /** One visible notification per key: a newer one replaces it instead of stacking up. */
  collapseKey: string;
  title: string;
  body: string;
  target: NotificationTarget;
}

export interface DeliveryJob {
  request: NotificationRequest;
  target: ChannelTarget;
}

export const PUSH_ALERT_QUEUE = 'push.alert';
export const PUSH_EXPO_DELIVERY_QUEUE = 'push.expo-delivery';
export const PUSH_WEB_DELIVERY_QUEUE = 'push.web-delivery';
