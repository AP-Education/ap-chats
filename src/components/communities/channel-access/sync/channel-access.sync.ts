import { Injectable, type OnModuleInit } from '@nestjs/common';

import { MemberAccessProjections } from '@/components/workspaces/access';
import type {
  AnnounceAccessChanges,
  MemberAccessProjection,
} from '@/components/workspaces/access/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import {
  CHANNEL_ACCESS_CHANGED_EVENT,
  ChannelAccessChangedEvent,
} from './channel-access-changed.event';
import { ParticipationRepository } from './repository/participation.repository';
import type { ParticipationScope } from './types';

/** Keeps who is in each channel in step with the channels' lists and the roles they name. */
@Injectable()
export class ChannelAccessSync implements MemberAccessProjection, OnModuleInit {
  constructor(
    private readonly participation: ParticipationRepository,
    private readonly events: EventPublisher,
    private readonly projections: MemberAccessProjections,
  ) {}

  onModuleInit(): void {
    this.projections.register(this);
  }

  refreshChannel(workspaceId: string, channelId: string): Promise<AnnounceAccessChanges> {
    return this.refresh({ workspaceId, channelIds: [channelId] });
  }

  refreshMembers(workspaceId: string, memberIds: string[]): Promise<AnnounceAccessChanges> {
    return this.refresh({ workspaceId, memberIds });
  }

  private async refresh(scope: ParticipationScope): Promise<AnnounceAccessChanges> {
    const ids = 'channelIds' in scope ? scope.channelIds : scope.memberIds;
    if (!ids.length) return () => {};

    const changes = await this.participation.reconcile(scope);

    const event = new ChannelAccessChangedEvent(scope, changes);
    return () => this.events.publish(CHANNEL_ACCESS_CHANGED_EVENT, event);
  }
}
