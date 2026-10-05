import { Injectable } from '@nestjs/common';

import type { ChannelKind } from '@/components/communities/channels';

import type { StoredNotificationSettings } from '../preferences/types';
import type { NotificationDecision } from './types';

@Injectable()
export class NotificationPolicyService {
  messageLevel(
    channelKind: ChannelKind,
    settings: StoredNotificationSettings,
  ): 'all' | 'mentions' | 'none' {
    if (settings.notificationsMuted || settings.level === 'none') return 'none';
    if (settings.mutedUntil && settings.mutedUntil > new Date()) return 'none';
    if (settings.level === 'all' || (settings.level === 'default' && channelKind === 'dm'))
      return 'all';
    return 'mentions';
  }

  shouldAlert(decision: NotificationDecision): boolean {
    const { kind, actorMemberId, recipientMemberId, channelKind, settings, mentioned } = decision;
    if (kind !== 'message.created' && kind !== 'message.forwarded') return false;
    if (actorMemberId === recipientMemberId) return false;
    const level = this.messageLevel(channelKind, settings);
    return level === 'all' || (level === 'mentions' && mentioned);
  }
}
