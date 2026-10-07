export interface WebPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface WebPushRegistration {
  installationId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
