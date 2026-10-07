import { Injectable } from '@nestjs/common';

import { messagePlainText } from '@/components/social/messages/content';

import { NotificationContent } from '../delivery/notification-content';
import type { ConversationAlert, MessageNotificationPayload } from '../delivery/types';
import { NotificationPolicyService } from '../policy';
import { PushAudienceRepository } from './repository/push-audience.repository';

/** The chat side's answers to delivery: what is new, whether it still matters, how it reads. */
@Injectable()
export class MessageNotificationContentService extends NotificationContent {
  constructor(
    private readonly audience: PushAudienceRepository,
    private readonly policy: NotificationPolicyService,
  ) {
    super();
  }

  async latestSeq(alert: ConversationAlert): Promise<bigint | null> {
    const context = await this.audience.context(alert);

    return context?.lastSeq ?? null;
  }

  async findEligible(alert: ConversationAlert): Promise<{ urgent: boolean } | null> {
    const preview = await this.preview(alert);

    return preview && { urgent: preview.urgent };
  }

  async render(alert: ConversationAlert): Promise<MessageNotificationPayload | null> {
    const preview = await this.preview(alert);
    if (!preview) return null;

    const { context, message } = preview;
    const plainText = await messagePlainText(message.contentMarkdown);
    const title =
      context.kind === 'dm'
        ? (message.actorName ?? 'Нове повідомлення')
        : `${message.actorName ?? 'Учасник'} · ${context.name}`;
    const section = context.kind === 'dm' ? 'direct' : 'channels';

    return {
      eventId: alert.id,
      userId: alert.userId,
      workspaceId: alert.workspaceId,
      channelId: alert.channelId,
      url: `/${section}/${alert.channelId}?pushWorkspace=${alert.workspaceId}`,
      title: Array.from(title).slice(0, 100).join(''),
      body: Array.from(plainText.trim()).slice(0, 180).join('') || 'Нове вкладення',
    };
  }

  private async preview(alert: ConversationAlert) {
    const [context, recipients] = await Promise.all([
      this.audience.context(alert),
      this.audience.recipients(alert, undefined, alert.memberId),
    ]);
    const recipient = recipients[0];
    if (!context || !recipient || recipient.userId !== alert.userId) return null;

    const level = this.policy.messageLevel(recipient);
    if (level === 'none') return null;

    // A mention outranks newer chatter, both for the preview and for the alert budget.
    const mention = await this.audience.latestMessage(alert, recipient, true);
    const message =
      mention ??
      (level === 'all' ? await this.audience.latestMessage(alert, recipient, false) : undefined);
    if (!message) return null;

    const urgent = context.kind === 'dm' || mention !== undefined;

    return { context, message, urgent };
  }
}
