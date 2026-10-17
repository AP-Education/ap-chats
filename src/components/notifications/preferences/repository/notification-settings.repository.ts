import type {
  ConversationNotificationSettings,
  MemberNotificationSettings,
  NotificationSettingsUpdate,
  StoredNotificationSettings,
} from '../types';

export abstract class NotificationSettingsRepository {
  abstract forChannel(channelId: string): Promise<MemberNotificationSettings[]>;
  abstract forMember(
    channelId: string,
    memberId: string,
  ): Promise<StoredNotificationSettings | null>;
  abstract update(
    channelId: string,
    memberId: string,
    change: NotificationSettingsUpdate,
  ): Promise<StoredNotificationSettings | null>;
  abstract forWorkspaceMember(memberId: string): Promise<NotificationSettingsUpdate | null>;
  abstract updateWorkspaceMember(
    memberId: string,
    change: NotificationSettingsUpdate,
  ): Promise<NotificationSettingsUpdate | null>;
  /** Every conversation the member belongs to in their workspace. */
  abstract conversationsOf(
    memberId: string,
  ): Promise<Array<ConversationNotificationSettings & { channelId: string }>>;
}
