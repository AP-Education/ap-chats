import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { channelMemberships } from '@/database/drizzle/schema';

import type { NotificationSettingsUpdate, StoredNotificationSettings } from '../types';
import { NotificationSettingsRepository } from './notification-settings.repository';

@Injectable()
export class DrizzleNotificationSettingsRepository extends NotificationSettingsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async forChannel(channelId: string): Promise<StoredNotificationSettings[]> {
    const rows = await this.txHost.tx
      .select({
        memberId: channelMemberships.memberId,
        level: channelMemberships.notificationLevel,
        mutedUntil: channelMemberships.mutedUntil,
        notificationsMuted: channelMemberships.notificationsMuted,
      })
      .from(channelMemberships)
      .where(eq(channelMemberships.channelId, channelId));
    return rows;
  }

  async forMember(channelId: string, memberId: string): Promise<StoredNotificationSettings | null> {
    const [row] = await this.txHost.tx
      .select({
        memberId: channelMemberships.memberId,
        level: channelMemberships.notificationLevel,
        mutedUntil: channelMemberships.mutedUntil,
        notificationsMuted: channelMemberships.notificationsMuted,
      })
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
      .returning({
        memberId: channelMemberships.memberId,
        level: channelMemberships.notificationLevel,
        mutedUntil: channelMemberships.mutedUntil,
        notificationsMuted: channelMemberships.notificationsMuted,
      });
    return row ?? null;
  }
}
