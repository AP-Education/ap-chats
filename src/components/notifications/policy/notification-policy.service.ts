import { Injectable } from '@nestjs/common';

import type {
  ConversationNotificationSettings,
  ConversationNotify,
  NotificationSettingsUpdate,
} from '../preferences/types';
import type { NotificationDecision } from './types';

/** Who hears what: whether a choice silences, and what each conversation tells its members about. */
@Injectable()
export class NotificationPolicyService {
  /** Silenced for good, for a while, or by choosing to hear nothing at all. */
  isMuted(settings: NotificationSettingsUpdate, now = new Date()): boolean {
    const isSnoozed = settings.mutedUntil !== null && settings.mutedUntil > now;
    return settings.notificationsMuted || settings.level === 'none' || isSnoozed;
  }

  /**
   * A channel speaks up for mentions unless someone chooses otherwise, and a muted workspace silences
   * all of its channels. A direct message is meant for the member, so it speaks up for every message.
   */
  messageLevel(
    { kind, channel, workspace }: ConversationNotificationSettings,
    now = new Date(),
  ): ConversationNotify {
    const followsWorkspace = kind === 'channel';
    const isSilenced =
      this.isMuted(channel, now) || (followsWorkspace && this.isMuted(workspace, now));
    if (isSilenced) return 'none';
    if (channel.level === 'all' || channel.level === 'mentions') return channel.level;
    if (!followsWorkspace) return 'all';

    return workspace.level === 'all' ? 'all' : 'mentions';
  }

  /** When the soonest of these snoozes runs out, and what it silenced may speak again. */
  nextChange(choices: NotificationSettingsUpdate[], now = new Date()): Date | null {
    const ends = choices.flatMap(({ mutedUntil }) =>
      mutedUntil && mutedUntil > now ? [mutedUntil.getTime()] : [],
    );
    return ends.length ? new Date(Math.min(...ends)) : null;
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
