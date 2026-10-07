import { Injectable } from '@nestjs/common';

import type { StoredNotificationSettings } from '../preferences/types';
import type { NotificationDecision } from './types';

@Injectable()
export class NotificationPolicyService {
  messageLevel(settings: StoredNotificationSettings): 'all' | 'mentions' | 'none' {
    if (settings.notificationsMuted || settings.level === 'none') return 'none';
    if (settings.mutedUntil && settings.mutedUntil > new Date()) return 'none';
    return settings.level === 'mentions' ? 'mentions' : 'all';
  }

  shouldAlert(decision: NotificationDecision): boolean {
    const { kind, actorMemberId, recipientMemberId, settings, mentioned } = decision;
    if (kind !== 'message.created' && kind !== 'message.forwarded') return false;
    if (actorMemberId === recipientMemberId) return false;
    const level = this.messageLevel(settings);
    return level === 'all' || (level === 'mentions' && mentioned);
  }
}
