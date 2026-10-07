// Notification messages of the native bridge; mirrors mobile/src/features/webview/types/index.ts.
export interface NativeNotificationOpen {
  type: 'notifications/open';
  payload: { eventId: string; userId: string; url: string };
}

export type NotificationsToNativeMessage =
  | { type: 'notifications/ready' }
  | { type: 'notifications/ack'; eventId: string }
  | { type: 'notifications/context'; payload: { connected: boolean } }
  | { type: 'notifications/message-sound' };
