import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { NotificationSettingsRepository } from './repository/notification-settings.repository';
import type {
  ChangeNotificationSettings,
  ChannelNotificationSettings,
  NotificationSettingsUpdate,
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
    const access = await this.access.requireReadAccess(member, channelId);
    if (!access.isMember) throw new NotFoundException('Channel membership not found');
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
    await this.access.requirePostAccess(member, channelId);
    const current = await this.repository.forMember(channelId, member.id);
    if (!current) throw new NotFoundException('Channel membership not found');
    const update = this.resolveUpdate(current, command);
    const saved = await this.repository.update(channelId, member.id, update);
    if (!saved) throw new NotFoundException('Channel membership not found');
    return this.toView(saved);
  }

  forChannel(channelId: string): Promise<StoredNotificationSettings[]> {
    return this.repository.forChannel(channelId);
  }

  private resolveUpdate(
    current: StoredNotificationSettings,
    command: ChangeNotificationSettings,
  ): NotificationSettingsUpdate {
    switch (command.type) {
      case 'level':
        if (!command.level) throw new BadRequestException('Notification level is required');
        return { level: command.level, notificationsMuted: false, mutedUntil: null };
      case 'mute':
        if (!command.duration) throw new BadRequestException('Mute duration is required');
        if (command.duration === 'indefinite') {
          return {
            level: current.level === 'none' ? 'default' : current.level,
            notificationsMuted: true,
            mutedUntil: null,
          };
        }
        return {
          level: current.level === 'none' ? 'default' : current.level,
          notificationsMuted: false,
          mutedUntil: new Date(Date.now() + (command.duration === 'hour' ? 3_600_000 : 86_400_000)),
        };
      case 'unmute':
        return {
          level: current.level === 'none' ? 'default' : current.level,
          notificationsMuted: false,
          mutedUntil: null,
        };
    }
  }

  private toView(settings: StoredNotificationSettings): ChannelNotificationSettings {
    return {
      level: settings.level,
      mutedUntil: settings.mutedUntil?.toISOString() ?? null,
      isMuted:
        settings.notificationsMuted ||
        settings.level === 'none' ||
        Boolean(settings.mutedUntil && settings.mutedUntil > new Date()),
    };
  }
}
