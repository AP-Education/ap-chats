import { Injectable } from '@nestjs/common';

import { MemberAccessProjection } from '@/components/workspaces/access';
import type { AnnounceAccessChanges } from '@/components/workspaces/access/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

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

  refreshChannel(workspaceId: string, channelId: string): Promise<AnnounceAccessChanges> {
    return this.refresh({ workspaceId, channelIds: [channelId] });
  }

  refreshMembers(workspaceId: string, memberIds: string[]): Promise<AnnounceAccessChanges> {
    return this.refresh({ workspaceId, memberIds });
  }

  /** Everyone in the channel loses it; runs before it is deleted, in the same transaction. */
  async closeChannel(workspaceId: string, channelId: string): Promise<AnnounceAccessChanges> {
    const revoked = await this.participation.participants(workspaceId, channelId);

    return this.announce({ workspaceId, channelIds: [channelId] }, { granted: [], revoked });
  }

  private async refresh(scope: ParticipationScope): Promise<AnnounceAccessChanges> {
    const ids = 'channelIds' in scope ? scope.channelIds : scope.memberIds;
    if (!ids.length) return () => {};

    const changes = await this.participation.reconcile(scope);

    return this.announce(scope, changes);
  }

  private announce(
    scope: ParticipationScope,
    changes: ParticipationChanges,
  ): AnnounceAccessChanges {
    const event = new ChannelAccessChangedEvent(scope, changes);
    return () => this.events.publish(CHANNEL_ACCESS_CHANGED_EVENT, event);
  }
}
