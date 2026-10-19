import type {
  ConversationNotificationSettings,
  MemberNotificationSettings,
  NotificationSettingsUpdate,
} from '../types';

export abstract class NotificationSettingsRepository {
  abstract forChannel(channelId: string): Promise<MemberNotificationSettings[]>;
  abstract channelSettings(
    channelId: string,
    memberId: string,
  ): Promise<NotificationSettingsUpdate | null>;
  abstract saveChannel(
    channelId: string,
    memberId: string,
    settings: NotificationSettingsUpdate,
  ): Promise<void>;
  abstract workspaceSettings(memberId: string): Promise<NotificationSettingsUpdate | null>;
  abstract saveWorkspace(memberId: string, settings: NotificationSettingsUpdate): Promise<void>;
  /** Every conversation the member belongs to in their workspace. */
  abstract conversationsOf(
    memberId: string,
  ): Promise<Array<ConversationNotificationSettings & { channelId: string }>>;
}
