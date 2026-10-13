import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { WorkspaceMembersRepository } from '@/components/workspaces/members';
import { Logger } from '@/globals/logger';
import { RealtimePublisher } from '@/globals/realtime';

import { ChannelAudienceFacade } from '../../channel-audience';
import type { ChannelRecipient } from '../../channel-audience/types';
import { type AccessNotice, accessNotices } from './access-notices';
import {
  CHANNEL_ACCESS_CHANGED_EVENT,
  ChannelAccessChangedEvent,
} from './channel-access-changed.event';
import type { ParticipationScope } from './types';

/** Delivers each notice of a recalculation to the person's sockets; `accessNotices` decides them. */
@Injectable()
export class ChannelAccessNoticesHandler {
  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly members: WorkspaceMembersRepository,
    private readonly realtime: RealtimePublisher,
    private readonly logger: Logger,
  ) {}

  @OnEvent(CHANNEL_ACCESS_CHANGED_EVENT)
  async onChanged(event: ChannelAccessChangedEvent): Promise<void> {
    const { workspaceId } = event.scope;

    try {
      const recipients = await this.recipientsOf(event.scope);
      const participants = new Map(
        [...recipients].map(([channelId, people]) => [channelId, people.map((p) => p.memberId)]),
      );
      const notices = accessNotices(event, participants);
      const userIdOf = await this.userIdsOf(workspaceId, notices, recipients);

      for (const notice of notices) {
        const userId = userIdOf.get(notice.memberId);
        if (!userId) continue;

        const payload =
          'channelId' in notice ? { workspaceId, channelId: notice.channelId } : { workspaceId };
        this.realtime.toUser(userId, notice.event, payload);
      }
    } catch (error) {
      this.logger.child({ workspaceId }).error({ err: error }, 'Channel access delivery failed');
    }
  }

  private async recipientsOf(scope: ParticipationScope): Promise<Map<string, ChannelRecipient[]>> {
    const recipients = new Map<string, ChannelRecipient[]>();
    if (!('channelIds' in scope)) return recipients;

    for (const channelId of scope.channelIds)
      recipients.set(channelId, await this.audience.recipients(scope.workspaceId, channelId));
    return recipients;
  }

  // Participants come with their user ids; only the people who left need looking up.
  private async userIdsOf(
    workspaceId: string,
    notices: AccessNotice[],
    recipients: Map<string, ChannelRecipient[]>,
  ): Promise<Map<string, string>> {
    const userIdOf = new Map(
      [...recipients.values()].flat().map((recipient) => [recipient.memberId, recipient.userId]),
    );

    const unaddressed = [...new Set(notices.map((notice) => notice.memberId))].filter(
      (memberId) => !userIdOf.has(memberId),
    );
    const people = await this.members.findManyByIds(workspaceId, unaddressed);
    for (const person of people) userIdOf.set(person.id, person.profile.oidcUserId);

    return userIdOf;
  }
}
