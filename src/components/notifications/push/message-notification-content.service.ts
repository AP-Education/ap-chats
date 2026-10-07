import { Injectable } from '@nestjs/common';

import { messagePlainText } from '@/components/social/messages/content';

import { NotificationPolicyService } from '../policy';
import { PushAudienceRepository } from './repository/push-audience.repository';
import type { ConversationAlert, MessageNotificationPayload } from './types';

@Injectable()
export class MessageNotificationContentService {
  constructor(
    private readonly audience: PushAudienceRepository,
    private readonly policy: NotificationPolicyService,
  ) {}

  async findEligibleMessage(alert: ConversationAlert) {
    const scope = {
      workspaceId: alert.workspaceId,
      channelId: alert.channelId,
      firstSeq: alert.firstSeq,
      lastSeq: alert.lastSeq,
    };
    const [context, recipients] = await Promise.all([
      this.audience.context(scope),
      this.audience.recipients(scope, undefined, alert.memberId),
    ]);
    const recipient = recipients[0];
    if (!context || !recipient || recipient.userId !== alert.userId) return null;

    const level = this.policy.messageLevel(recipient);
    if (level === 'none') return null;

    const message = await this.audience.latestMessage(scope, recipient, level === 'mentions');
    if (!message) return null;

    return { context, message };
  }

  async buildNotification(alert: ConversationAlert): Promise<MessageNotificationPayload | null> {
    const preview = await this.findEligibleMessage(alert);
    if (!preview) return null;

    const { context, message } = preview;
    const plainText = await messagePlainText(message.contentMarkdown);
    const title =
      context.kind === 'dm'
        ? (message.actorName ?? 'Нове повідомлення')
        : `${message.actorName ?? 'Учасник'} · ${context.name}`;

    return {
      eventId: alert.id,
      userId: alert.userId,
      workspaceId: alert.workspaceId,
      channelId: alert.channelId,
      url: `/${context.kind === 'dm' ? 'direct' : 'channels'}/${alert.channelId}?pushWorkspace=${alert.workspaceId}`,
      title: Array.from(title).slice(0, 100).join(''),
      body: Array.from(plainText.trim()).slice(0, 180).join('') || 'Нове вкладення',
    };
  }
}
