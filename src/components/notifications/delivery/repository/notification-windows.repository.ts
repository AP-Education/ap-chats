import type { ConversationAlert, NotificationWindow } from '../types';

export interface WindowLimits {
  cooldownSeconds: number;
  userAlertsPerMinute: number;
  // DMs and mentions skip the per-user budget, so a busy channel can't crowd them out.
  urgent: boolean;
}

export type WindowReservation =
  | { status: 'reserved'; window: NotificationWindow }
  | { status: 'superseded' }
  | { status: 'deferred'; until: Date };

export abstract class NotificationWindowsRepository {
  abstract latest(userId: string, channelId: string): Promise<NotificationWindow | undefined>;
  abstract reserve(
    alert: ConversationAlert,
    now: Date,
    limits: WindowLimits,
  ): Promise<WindowReservation>;
}
