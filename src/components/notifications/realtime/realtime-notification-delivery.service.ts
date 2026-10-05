import { Injectable } from '@nestjs/common';

import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { ChannelsRepository } from '@/components/communities/channels';
import { MentionsFacade } from '@/components/social/mentions';
import { Logger } from '@/globals/logger';
import { RealtimePublisher } from '@/globals/realtime';

import { NotificationPolicyService } from '../policy';
import { NotificationSettingsService } from '../preferences';
import type { NotificationSourceEvent, UnreadMutation } from './types';

@Injectable()
export class RealtimeNotificationDeliveryService {
  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly channels: ChannelsRepository,
    private readonly mentions: MentionsFacade,
    private readonly settings: NotificationSettingsService,
    private readonly policy: NotificationPolicyService,
    private readonly realtime: RealtimePublisher,
    private readonly logger: Logger,
  ) {}

  async deliver(event: NotificationSourceEvent): Promise<void> {
    try {
      const [recipients, channel] = await Promise.all([
        this.audience.recipients(event.workspaceId, event.channelId),
        this.channels.findById(event.workspaceId, event.channelId),
      ]);
      if (!channel || !recipients.length) return;
      const [settings, mentionedIds] = await Promise.all([
        this.settings.forChannel(event.channelId),
        this.mentions.mentionedMemberIds(event.messageIds),
      ]);
      const settingsByMember = new Map(settings.map((item) => [item.memberId, item]));
      const mentioned = new Set(mentionedIds);
      for (const recipient of recipients) {
        const preference = settingsByMember.get(recipient.memberId);
        if (!preference) continue;
        const mutation: UnreadMutation = {
          workspaceId: event.workspaceId,
          channelId: event.channelId,
          kind: channel.kind,
          eventId: event.eventId,
          operation: event.operation,
          subject: event.kind === 'call.created' ? 'call' : 'message',
          entries: event.entries,
          alert: this.policy.shouldAlert({
            kind: event.kind,
            actorMemberId: event.actorMemberId,
            recipientMemberId: recipient.memberId,
            channelKind: channel.kind,
            settings: preference,
            mentioned: mentioned.has(recipient.memberId),
          }),
        };
        this.realtime.toUser(recipient.userId, 'social:unread', mutation);
      }
    } catch (error) {
      this.logger
        .child({ channelId: event.channelId })
        .error({ err: error }, 'Notification delivery failed');
    }
  }
}
