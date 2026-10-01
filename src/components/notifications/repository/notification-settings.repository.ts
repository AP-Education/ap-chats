import type { NotificationSettingsUpdate, StoredNotificationSettings } from '../types';

export abstract class NotificationSettingsRepository {
  abstract forChannel(channelId: string): Promise<StoredNotificationSettings[]>;
  abstract forMember(
    channelId: string,
    memberId: string,
  ): Promise<StoredNotificationSettings | null>;
  abstract update(
    channelId: string,
    memberId: string,
    change: NotificationSettingsUpdate,
  ): Promise<StoredNotificationSettings | null>;
}
