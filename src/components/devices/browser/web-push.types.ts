export interface WebPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  activeUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface WebPushRegistration {
  installationId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
export interface WebPushPresence {
  focused: boolean;
}
