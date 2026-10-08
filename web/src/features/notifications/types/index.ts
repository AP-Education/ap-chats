// Notification messages of the native bridge; mirrors mobile/src/features/webview/types/index.ts.
/** A tapped notification as a client hands it over; untrusted until `notificationRoute` reads it. */
export interface NotificationTap {
  userId: unknown;
  target: unknown;
}

export interface NativeNotificationOpen {
  type: 'notifications/open';
  payload: NotificationTap & { eventId: string };
}

export type NotificationsToNativeMessage =
  | { type: 'notifications/ready' }
  | { type: 'notifications/ack'; eventId: string }
  | { type: 'notifications/dismiss'; collapseKey: string }
  | { type: 'notifications/context'; payload: { attending: boolean } }
  | { type: 'notifications/message-sound' };
