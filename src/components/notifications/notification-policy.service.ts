import { Injectable } from '@nestjs/common';

import type { NotificationDecision } from './types';

@Injectable()
export class NotificationPolicyService {
  shouldAlert(decision: NotificationDecision): boolean {
    const { kind, actorMemberId, recipientMemberId, channelKind, settings, mentioned } = decision;
    if (kind !== 'message.created' && kind !== 'message.forwarded') return false;
    if (actorMemberId === recipientMemberId) return false;
    if (settings.notificationsMuted || settings.level === 'none') return false;
    if (settings.mutedUntil && settings.mutedUntil > new Date()) return false;
    if (settings.level === 'all') return true;
    if (settings.level === 'mentions') return mentioned;
    return channelKind === 'dm' || mentioned;
  }
}
