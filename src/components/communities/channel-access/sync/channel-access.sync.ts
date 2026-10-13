import { Injectable } from '@nestjs/common';

import { MemberAccessProjection } from '@/components/workspaces/access';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher/event-publisher';
import type { Announce } from '@/globals/publisher/types';

import {
  CHANNEL_ACCESS_CHANGED_EVENT,
  ChannelAccessChangedEvent,
} from './channel-access-changed.event';
import { ParticipationRepository } from './repository/participation.repository';
import type { ParticipationChanges, ParticipationScope } from './types';

/** Keeps who is in each channel in step with the channels' lists and the roles they name. */
@Injectable()
export class ChannelAccessSync extends MemberAccessProjection {
  constructor(
    private readonly participation: ParticipationRepository,
    private readonly events: EventPublisher,
  ) {
    super();
  }

  refreshChannel(workspaceId: string, channelId: string): Promise<Announce> {
    return this.refresh({ workspaceId, channelIds: [channelId] });
  }

  refreshMembers(workspaceId: string, memberIds: string[]): Promise<Announce> {
    return this.refresh({ workspaceId, memberIds });
  }

  /** Everyone in the channel loses it; runs before it is deleted, in the same transaction. */
  async closeChannel(workspaceId: string, channelId: string): Promise<Announce> {
    const revoked = await this.participation.participants(workspaceId, channelId);

    return this.announce({ workspaceId, channelIds: [channelId] }, { granted: [], revoked });
  }

  private async refresh(scope: ParticipationScope): Promise<Announce> {
    const ids = 'channelIds' in scope ? scope.channelIds : scope.memberIds;
    if (!ids.length) return nothingToAnnounce;

    const changes = await this.participation.reconcile(scope);

    return this.announce(scope, changes);
  }

  private announce(scope: ParticipationScope, changes: ParticipationChanges): Promise<Announce> {
    const event = new ChannelAccessChangedEvent(scope, changes);
    return this.events.record(CHANNEL_ACCESS_CHANGED_EVENT, event);
  }
}
