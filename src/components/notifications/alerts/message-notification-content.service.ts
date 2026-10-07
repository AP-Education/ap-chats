import { Injectable } from '@nestjs/common';

import { messagePlainText } from '@/components/social/messages/content';

import { NotificationContent } from '../delivery/notification-content';
import type { NotificationPayload } from '../delivery/types';
import { NotificationPolicyService } from '../policy';
import {
  type AlertConversation,
  PushAudienceRepository,
} from './repository/push-audience.repository';
import type { ConversationAlert } from './types';

const CONVERSATION_START = '1';

/** The chat side's answer to delivery: the newest unread message, as it reads right now. */
@Injectable()
export class MessageNotificationContentService extends NotificationContent {
  constructor(
    private readonly audience: PushAudienceRepository,
    private readonly policy: NotificationPolicyService,
  ) {
    super();
  }

  async render(alert: ConversationAlert): Promise<NotificationPayload | null> {
    const preview = await this.preview(alert);
    if (!preview) return null;

    const { conversation, message } = preview;
    const text = await messagePlainText(message.contentMarkdown);

    return {
      eventId: alert.id,
      userId: alert.userId,
      collapseKey: alert.channelId,
      target: {
        type: 'conversation',
        workspaceId: alert.workspaceId,
        channelId: alert.channelId,
        kind: conversation.kind === 'dm' ? 'dm' : 'channel',
      },
      title: clip(titleFor(conversation, message.actorName), 100),
      body: clip(text.trim(), 180) || 'Нове вкладення',
    };
  }

  private async preview(alert: ConversationAlert) {
    const conversation = await this.audience.conversation(alert);
    if (!conversation) return null;

    // Everything still unread, so an alert shows the latest message, not the one that triggered it.
    const unread = {
      ...alert,
      firstSeq: CONVERSATION_START,
      lastSeq: conversation.lastSeq.toString(),
    };
    const recipient = await this.audience.memberRecipient(unread, alert.memberId);
    if (!recipient || recipient.userId !== alert.userId) return null;

    const level = this.policy.messageLevel(recipient);
    if (level === 'none') return null;

    const message = await this.audience.latestMessage(unread, recipient, level === 'mentions');
    return message ? { conversation, message } : null;
  }
}

function titleFor(conversation: AlertConversation, actorName: string | null): string {
  if (conversation.kind === 'dm') return actorName ?? 'Нове повідомлення';

  return `${actorName ?? 'Учасник'} · ${conversation.name}`;
}

// Counted in characters, not UTF-16 units, so an emoji is never cut in half.
function clip(text: string, max: number): string {
  return Array.from(text).slice(0, max).join('');
}
