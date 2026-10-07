import { Injectable } from '@nestjs/common';

import { messagePlainText } from '@/components/social/messages/content';

import { NotificationContent } from '../delivery/notification-content';
import type { ConversationAlert, MessageNotificationPayload } from '../delivery/types';
import { NotificationPolicyService } from '../policy';
import { PushAudienceRepository } from './repository/push-audience.repository';

/** The chat side's answer to delivery: the newest unread message, as it reads right now. */
@Injectable()
export class MessageNotificationContentService extends NotificationContent {
  constructor(
    private readonly audience: PushAudienceRepository,
    private readonly policy: NotificationPolicyService,
  ) {
    super();
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

    // Everything still unread up to now, so a coalesced alert shows the latest message, not its first.
    const unread = { ...alert, firstSeq: '1', lastSeq: context.lastSeq.toString() };
    const message = await this.audience.latestMessage(unread, recipient, level === 'mentions');
    if (!message) return null;

    return { context, message };
  }
}
