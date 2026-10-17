import { Injectable } from '@nestjs/common';

import { conversationNotify } from '../preferences/notification-settings.rules';
import type { ConversationNotificationSettings, ConversationNotify } from '../preferences/types';
import type { NotificationDecision } from './types';

@Injectable()
export class NotificationPolicyService {
  messageLevel(settings: ConversationNotificationSettings): ConversationNotify {
    return conversationNotify(settings);
  }

  shouldAlert(decision: NotificationDecision): boolean {
    const { kind, actorMemberId, recipientMemberId, settings, mentioned } = decision;
    if (kind !== 'message.created' && kind !== 'message.forwarded') return false;
    if (actorMemberId === recipientMemberId) return false;
    return this.wantsMessages(settings, mentioned);
  }

  /** For someone who already has unread messages from others; own messages are filtered upstream. */
  wantsMessages(settings: ConversationNotificationSettings, mentioned: boolean): boolean {
    const level = this.messageLevel(settings);
    return level === 'all' || (level === 'mentions' && mentioned);
  }
}
