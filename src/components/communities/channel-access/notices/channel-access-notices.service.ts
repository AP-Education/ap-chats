import { Injectable } from '@nestjs/common';

import { WorkspaceMembersRepository } from '@/components/workspaces/members';

import { ChannelAudienceFacade } from '../../channel-audience';
import type { ChannelRecipient } from '../../channel-audience/types';
import type { ChannelAccessChangedEvent } from '../sync/channel-access-changed.event';
import type { ParticipationScope } from '../sync/types';
import { type AccessNotice, accessNotices } from './access-notices';

export interface AddressedNotice {
  userId: string;
  event: AccessNotice['event'];
  payload: { workspaceId: string; channelId?: string };
}

@Injectable()
export class ChannelAccessNotices {
  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly members: WorkspaceMembersRepository,
  ) {}

  /** Every notice of a recalculation, addressed to the person who should get it. */
  async addressed(event: ChannelAccessChangedEvent): Promise<AddressedNotice[]> {
    const { workspaceId } = event.scope;
    const recipients = await this.recipientsOf(event.scope);

    const participants = new Map(
      [...recipients].map(([channelId, people]) => [channelId, people.map((p) => p.memberId)]),
    );
    const notices = accessNotices(event, participants);
    const userIdOf = await this.userIdsOf(workspaceId, notices, recipients);

    return notices.flatMap((notice) => {
      const userId = userIdOf.get(notice.memberId);
      if (!userId) return [];

      const payload =
        'channelId' in notice ? { workspaceId, channelId: notice.channelId } : { workspaceId };
      return [{ userId, event: notice.event, payload }];
    });
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
