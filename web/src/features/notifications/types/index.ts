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

/** One notifications control for every shell; each adapter decides what `change` does there. */
export interface PushControl {
  status: 'on' | 'off' | 'blocked';
  hint: string;
  busy: boolean;
  change: () => void;
}

/** The phone's own notification permission, which only the OS and its Settings can change. */
export type NativePushPermission = 'granted' | 'denied' | 'undetermined';

export interface NativePushPermissionMessage {
  type: 'notifications/permission';
  status: NativePushPermission;
}

export type NotificationsToNativeMessage =
  | { type: 'notifications/ready' }
  | { type: 'notifications/ack'; eventId: string }
  | { type: 'notifications/dismiss'; collapseKey: string }
  | { type: 'notifications/context'; payload: { attending: boolean } }
  | { type: 'notifications/message-sound' }
  | { type: 'notifications/permission-check' }
  | { type: 'notifications/settings' };
