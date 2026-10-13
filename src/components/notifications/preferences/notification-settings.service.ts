import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { isMuted, settingsAfter } from './notification-settings.rules';
import { NotificationSettingsRepository } from './repository/notification-settings.repository';
import type {
  ChangeNotificationSettings,
  ChannelNotificationSettings,
  StoredNotificationSettings,
} from './types';

@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly repository: NotificationSettingsRepository,
  ) {}

  @Transactional()
  async get(member: WorkspaceMember, channelId: string): Promise<ChannelNotificationSettings> {
    await this.access.requireViewAccess(member, channelId);
    const settings = await this.repository.forMember(channelId, member.id);
    if (!settings) throw new NotFoundException('Channel membership not found');
    return this.toView(settings);
  }

  @Transactional()
  async change(
    member: WorkspaceMember,
    channelId: string,
    command: ChangeNotificationSettings,
  ): Promise<ChannelNotificationSettings> {
    await this.access.requireMembership(member, channelId);
    const current = await this.repository.forMember(channelId, member.id);
    if (!current) throw new NotFoundException('Channel membership not found');
    const saved = await this.repository.update(
      channelId,
      member.id,
      settingsAfter(current, command),
    );
    if (!saved) throw new NotFoundException('Channel membership not found');
    return this.toView(saved);
  }

  forChannel(channelId: string): Promise<StoredNotificationSettings[]> {
    return this.repository.forChannel(channelId);
  }

  private toView(settings: StoredNotificationSettings): ChannelNotificationSettings {
    return {
      level: settings.level,
      mutedUntil: settings.mutedUntil?.toISOString() ?? null,
      isMuted: isMuted(settings),
    };
  }
}
