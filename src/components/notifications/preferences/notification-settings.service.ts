import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import {
  conversationNotify,
  isMuted,
  settingsAfter,
  snoozedUntil,
} from './notification-settings.rules';
import { NotificationSettingsRepository } from './repository/notification-settings.repository';
import type {
  ChangeNotificationSettings,
  MemberNotificationSettings,
  NotificationSettingsUpdate,
  NotificationSettingsView,
  WorkspaceNotifications,
} from './types';

@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly repository: NotificationSettingsRepository,
  ) {}

  @Transactional()
  async get(member: WorkspaceMember, channelId: string): Promise<NotificationSettingsView> {
    await this.access.requireViewAccess(member, channelId);
    const settings = await this.repository.forMember(channelId, member.id);
    if (!settings) throw new NotFoundException('Channel membership not found');
    return settingsView(settings);
  }

  @Transactional()
  async change(
    member: WorkspaceMember,
    channelId: string,
    command: ChangeNotificationSettings,
  ): Promise<NotificationSettingsView> {
    await this.access.requireMembership(member, channelId);
    const current = await this.repository.forMember(channelId, member.id);
    if (!current) throw new NotFoundException('Channel membership not found');
    const saved = await this.repository.update(
      channelId,
      member.id,
      settingsAfter(current, command),
    );
    if (!saved) throw new NotFoundException('Channel membership not found');
    return settingsView(saved);
  }

  @Transactional()
  async forWorkspace(member: WorkspaceMember): Promise<WorkspaceNotifications> {
    const settings = await this.repository.forWorkspaceMember(member.id);
    if (!settings) throw new NotFoundException('Workspace membership not found');
    return this.workspaceNotifications(member, settings);
  }

  @Transactional()
  async changeForWorkspace(
    member: WorkspaceMember,
    command: ChangeNotificationSettings,
  ): Promise<WorkspaceNotifications> {
    const current = await this.repository.forWorkspaceMember(member.id);
    if (!current) throw new NotFoundException('Workspace membership not found');
    const saved = await this.repository.updateWorkspaceMember(
      member.id,
      settingsAfter(current, command),
    );
    if (!saved) throw new NotFoundException('Workspace membership not found');
    return this.workspaceNotifications(member, saved);
  }

  forChannel(channelId: string): Promise<MemberNotificationSettings[]> {
    return this.repository.forChannel(channelId);
  }

  async mutedMembers(channelId: string): Promise<string[]> {
    const members = await this.repository.forChannel(channelId);
    return members
      .filter((member) => conversationNotify(member) === 'none')
      .map((member) => member.memberId);
  }

  private async workspaceNotifications(
    member: WorkspaceMember,
    settings: NotificationSettingsUpdate,
  ): Promise<WorkspaceNotifications> {
    const now = new Date();
    const conversations = await this.repository.conversationsOf(member.id);

    return {
      settings: settingsView(settings),
      conversations: conversations.map((conversation) => ({
        channelId: conversation.channelId,
        notify: conversationNotify(conversation, now),
        mutedUntil: snoozedUntil(conversation, now)?.toISOString() ?? null,
      })),
    };
  }
}

function settingsView(settings: NotificationSettingsUpdate): NotificationSettingsView {
  return {
    level: settings.level,
    mutedUntil: settings.mutedUntil?.toISOString() ?? null,
    isMuted: isMuted(settings),
  };
}
