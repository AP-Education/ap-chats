import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { channelMemberships, channels, workspaceMembers } from '@/database/drizzle/schema';

import type {
  ConversationNotificationSettings,
  MemberNotificationSettings,
  NotificationSettingsUpdate,
} from '../types';
import { NotificationSettingsRepository } from './notification-settings.repository';

const channelSettings = {
  level: channelMemberships.notificationLevel,
  mutedUntil: channelMemberships.mutedUntil,
  notificationsMuted: channelMemberships.notificationsMuted,
};

const workspaceSettings = {
  level: workspaceMembers.notificationLevel,
  mutedUntil: workspaceMembers.mutedUntil,
  notificationsMuted: workspaceMembers.notificationsMuted,
};

function storedSettings({ level, notificationsMuted, mutedUntil }: NotificationSettingsUpdate) {
  return { notificationLevel: level, notificationsMuted, mutedUntil };
}

@Injectable()
export class DrizzleNotificationSettingsRepository extends NotificationSettingsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  forChannel(channelId: string): Promise<MemberNotificationSettings[]> {
    return this.txHost.tx
      .select({
        memberId: channelMemberships.memberId,
        kind: channels.kind,
        channel: channelSettings,
        workspace: workspaceSettings,
      })
      .from(channelMemberships)
      .innerJoin(channels, eq(channels.id, channelMemberships.channelId))
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .where(eq(channelMemberships.channelId, channelId));
  }

  async channelSettings(
    channelId: string,
    memberId: string,
  ): Promise<NotificationSettingsUpdate | null> {
    const [row] = await this.txHost.tx
      .select(channelSettings)
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    return row ?? null;
  }

  async saveChannel(
    channelId: string,
    memberId: string,
    settings: NotificationSettingsUpdate,
  ): Promise<void> {
    await this.txHost.tx
      .update(channelMemberships)
      .set(storedSettings(settings))
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
  }

  async workspaceSettings(memberId: string): Promise<NotificationSettingsUpdate | null> {
    const [row] = await this.txHost.tx
      .select(workspaceSettings)
      .from(workspaceMembers)
      .where(eq(workspaceMembers.id, memberId));
    return row ?? null;
  }

  async saveWorkspace(memberId: string, settings: NotificationSettingsUpdate): Promise<void> {
    await this.txHost.tx
      .update(workspaceMembers)
      .set(storedSettings(settings))
      .where(eq(workspaceMembers.id, memberId));
  }

  conversationsOf(
    memberId: string,
  ): Promise<Array<ConversationNotificationSettings & { channelId: string }>> {
    return this.txHost.tx
      .select({
        channelId: channelMemberships.channelId,
        kind: channels.kind,
        channel: channelSettings,
        workspace: workspaceSettings,
      })
      .from(channelMemberships)
      .innerJoin(channels, eq(channels.id, channelMemberships.channelId))
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .where(eq(channelMemberships.memberId, memberId));
  }
}
