import type { WorkspaceNotifications } from '../types';

export const NOTIFICATIONS_CHANGED_EVENT = 'notifications.settings.changed';

export class NotificationsChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly notifications: WorkspaceNotifications,
  ) {}
}
