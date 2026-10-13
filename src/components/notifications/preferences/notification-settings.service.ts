import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
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
    private readonly access: ChannelAccessFacade,
    private readonly repository: NotificationSettingsRepository,
  ) {}

  @Transactional()
  async get(member: WorkspaceMember, channelId: string): Promise<ChannelNotificationSettings> {
    await this.requireMembership(member, channelId);
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
    await this.requireMembership(member, channelId);
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

  // Settings are the member's own: posting rights or a departed DM peer do not matter here.
  private async requireMembership(member: WorkspaceMember, channelId: string): Promise<void> {
    const { isMember } = await this.access.requireReadAccess(member, channelId);
    if (!isMember) throw new NotFoundException('Channel membership not found');
  }

  private toView(settings: StoredNotificationSettings): ChannelNotificationSettings {
    return {
      level: settings.level,
      mutedUntil: settings.mutedUntil?.toISOString() ?? null,
      isMuted: isMuted(settings),
    };
  }
}
