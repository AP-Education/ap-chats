import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { channelMemberships, channels, workspaceMembers } from '@/database/drizzle/schema';

import type {
  ConversationNotificationSettings,
  MemberNotificationSettings,
  NotificationSettingsUpdate,
  StoredNotificationSettings,
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

  async forMember(channelId: string, memberId: string): Promise<StoredNotificationSettings | null> {
    const [row] = await this.txHost.tx
      .select({ memberId: channelMemberships.memberId, ...channelSettings })
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    return row ?? null;
  }

  async update(
    channelId: string,
    memberId: string,
    change: NotificationSettingsUpdate,
  ): Promise<StoredNotificationSettings | null> {
    const [row] = await this.txHost.tx
      .update(channelMemberships)
      .set({
        notificationLevel: change.level,
        notificationsMuted: change.notificationsMuted,
        mutedUntil: change.mutedUntil,
      })
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      )
      .returning({ memberId: channelMemberships.memberId, ...channelSettings });
    return row ?? null;
  }

  async forWorkspaceMember(memberId: string): Promise<NotificationSettingsUpdate | null> {
    const [row] = await this.txHost.tx
      .select(workspaceSettings)
      .from(workspaceMembers)
      .where(eq(workspaceMembers.id, memberId));
    return row ?? null;
  }

  async updateWorkspaceMember(
    memberId: string,
    change: NotificationSettingsUpdate,
  ): Promise<NotificationSettingsUpdate | null> {
    const [row] = await this.txHost.tx
      .update(workspaceMembers)
      .set({
        notificationLevel: change.level,
        notificationsMuted: change.notificationsMuted,
        mutedUntil: change.mutedUntil,
      })
      .where(eq(workspaceMembers.id, memberId))
      .returning(workspaceSettings);
    return row ?? null;
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
