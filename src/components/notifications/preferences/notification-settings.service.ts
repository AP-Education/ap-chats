import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { NotificationPolicyService } from '../policy';
import {
  NOTIFICATIONS_CHANGED_EVENT,
  NotificationsChangedEvent,
} from './events/notifications-changed.event';
import { NotificationSettingsRepository } from './repository/notification-settings.repository';
import type {
  ChangeNotificationSettings,
  MemberNotificationSettings,
  NotificationSettingsUpdate,
  NotificationSettingsView,
  WorkspaceNotifications,
} from './types';

const SNOOZE_MS = { hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000 };

/** A member's notification choices for a channel and for a workspace, read and changed. */
@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly repository: NotificationSettingsRepository,
    private readonly policy: NotificationPolicyService,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  async ofChannel(member: WorkspaceMember, channelId: string): Promise<NotificationSettingsView> {
    await this.access.requireViewAccess(member, channelId);
    return this.view(await this.channelChoice(member, channelId));
  }

  async changeChannel(
    member: WorkspaceMember,
    channelId: string,
    command: ChangeNotificationSettings,
  ): Promise<NotificationSettingsView> {
    const { view, announce } = await this.saveChannelChange(member, channelId, command);
    announce();

    return view;
  }

  @Transactional()
  ofWorkspace(member: WorkspaceMember): Promise<WorkspaceNotifications> {
    return this.workspaceNotifications(member);
  }

  async changeWorkspace(
    member: WorkspaceMember,
    command: ChangeNotificationSettings,
  ): Promise<WorkspaceNotifications> {
    const { notifications, announce } = await this.saveWorkspaceChange(member, command);
    announce();

    return notifications;
  }

  /** Every member's choices for a channel, with their workspace's that it falls back on. */
  membersOf(channelId: string): Promise<MemberNotificationSettings[]> {
    return this.repository.forChannel(channelId);
  }

  /** Members a channel tells nothing right now, so a call there rings for everyone else. */
  async mutedMembers(channelId: string): Promise<string[]> {
    const now = new Date();
    const members = await this.repository.forChannel(channelId);

    return members
      .filter((member) => this.policy.messageLevel(member, now) === 'none')
      .map((member) => member.memberId);
  }

  @Transactional()
  private async saveChannelChange(
    member: WorkspaceMember,
    channelId: string,
    command: ChangeNotificationSettings,
  ): Promise<{ view: NotificationSettingsView; announce: Announce }> {
    await this.access.requireMembership(member, channelId);
    const changed = this.changed(await this.channelChoice(member, channelId), command);
    await this.repository.saveChannel(channelId, member.id, changed);

    const notifications = await this.workspaceNotifications(member);
    return { view: this.view(changed), announce: await this.announce(member, notifications) };
  }

  @Transactional()
  private async saveWorkspaceChange(
    member: WorkspaceMember,
    command: ChangeNotificationSettings,
  ): Promise<{ notifications: WorkspaceNotifications; announce: Announce }> {
    const changed = this.changed(await this.workspaceChoice(member), command);
    await this.repository.saveWorkspace(member.id, changed);

    const notifications = await this.workspaceNotifications(member);
    return { notifications, announce: await this.announce(member, notifications) };
  }

  private async workspaceNotifications(member: WorkspaceMember): Promise<WorkspaceNotifications> {
    const now = new Date();
    const settings = await this.workspaceChoice(member);
    const conversations = await this.repository.conversationsOf(member.id);

    const muted = conversations.filter(
      (conversation) => this.policy.messageLevel(conversation, now) === 'none',
    );
    const snoozes = [settings, ...conversations.map(({ channel }) => channel)];

    return {
      settings: this.view(settings),
      mutedChannelIds: muted.map(({ channelId }) => channelId),
      changesAt: this.policy.nextChange(snoozes, now)?.toISOString() ?? null,
    };
  }

  // Muting and unmuting lift a 'none' level back to the default, so unmuting always means sound.
  private changed(
    current: NotificationSettingsUpdate,
    command: ChangeNotificationSettings,
  ): NotificationSettingsUpdate {
    const audibleLevel = current.level === 'none' ? 'default' : current.level;

    switch (command.type) {
      case 'level':
        return { level: command.level, notificationsMuted: false, mutedUntil: null };
      case 'mute':
        if (command.duration === 'indefinite')
          return { level: audibleLevel, notificationsMuted: true, mutedUntil: null };
        return {
          level: audibleLevel,
          notificationsMuted: false,
          mutedUntil: new Date(Date.now() + SNOOZE_MS[command.duration]),
        };
      case 'unmute':
        return { level: audibleLevel, notificationsMuted: false, mutedUntil: null };
    }
  }

  private view(settings: NotificationSettingsUpdate): NotificationSettingsView {
    return {
      level: settings.level,
      mutedUntil: settings.mutedUntil?.toISOString() ?? null,
      isMuted: this.policy.isMuted(settings),
    };
  }

  private announce(
    member: WorkspaceMember,
    notifications: WorkspaceNotifications,
  ): Promise<Announce> {
    const changed = new NotificationsChangedEvent(
      member.profile.oidcUserId,
      member.workspaceId,
      notifications,
    );
    return this.events.record(NOTIFICATIONS_CHANGED_EVENT, changed);
  }

  private async channelChoice(
    member: WorkspaceMember,
    channelId: string,
  ): Promise<NotificationSettingsUpdate> {
    const choice = await this.repository.channelSettings(channelId, member.id);
    if (!choice) throw new NotFoundException('Channel membership not found');
    return choice;
  }

  private async workspaceChoice(member: WorkspaceMember): Promise<NotificationSettingsUpdate> {
    const choice = await this.repository.workspaceSettings(member.id);
    if (!choice) throw new NotFoundException('Workspace membership not found');
    return choice;
  }
}
