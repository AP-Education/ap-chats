import { Injectable } from '@nestjs/common';

import { NotificationSettingsService } from '@/components/notifications/preferences';

import { CallsRepository } from './repository/calls.repository';

/** Who hears a call ring: every active member but the caller and whoever muted the conversation. */
@Injectable()
export class RingAudience {
  constructor(
    private readonly calls: CallsRepository,
    private readonly notificationSettings: NotificationSettingsService,
  ) {}

  async of(channelId: string, callerMemberId: string): Promise<string[]> {
    const muted = await this.notificationSettings.mutedMembers(channelId);
    return this.calls.ringRecipients(channelId, [callerMemberId, ...muted]);
  }
}
