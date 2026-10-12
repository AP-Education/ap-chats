import { Injectable, type OnModuleInit } from '@nestjs/common';

import {
  type AnnounceAccessChanges,
  type MemberAccessProjection,
  MemberAccessProjections,
} from '@/components/workspaces/access';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import { ChannelMembershipsRepository } from '../../memberships/repository';
import type { MembershipScope } from '../../memberships/types';
import {
  CHANNEL_ACCESS_CHANGED_EVENT,
  ChannelAccessChangedEvent,
} from './channel-access-changed.event';

/** Keeps who is in each channel in step with the channels' lists and the roles they name. */
@Injectable()
export class ChannelAccessSync implements MemberAccessProjection, OnModuleInit {
  constructor(
    private readonly memberships: ChannelMembershipsRepository,
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

  private async refresh(scope: MembershipScope): Promise<AnnounceAccessChanges> {
    const ids = 'channelIds' in scope ? scope.channelIds : scope.memberIds;
    if (!ids.length) return () => {};

    const changes = await this.memberships.reconcile(scope);

    const event = new ChannelAccessChangedEvent(scope, changes);
    return () => this.events.publish(CHANNEL_ACCESS_CHANGED_EVENT, event);
  }
}
