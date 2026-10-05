export interface WebPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
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
  workspaceId?: string;
  channelId?: string;
}
