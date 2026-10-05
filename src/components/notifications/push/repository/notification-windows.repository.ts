import type { ConversationAlert, NotificationWindow } from '../types';

export abstract class NotificationWindowsRepository {
  abstract latest(userId: string, channelId: string): Promise<NotificationWindow | undefined>;
  abstract reserve(
    alert: ConversationAlert,
    now: Date,
    cooldownSeconds: number,
    userLimit: number,
  ): Promise<NotificationWindow | null>;
}
