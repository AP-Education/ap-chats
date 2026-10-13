import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import {
  READ_STATE_ADVANCED_EVENT,
  ReadStateAdvancedEvent,
} from './events/read-state-advanced.event';
import { ReadStateRepository } from './repository/read-state.repository';
import type { ChannelReadState, WorkspaceChannelUnread } from './types';

@Injectable()
export class ReadStateService {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly repository: ReadStateRepository,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  workspace(member: WorkspaceMember): Promise<WorkspaceChannelUnread[]> {
    return this.repository.workspaceSummary(member.workspaceId, member.id);
  }

  @Transactional()
  async getState(member: WorkspaceMember, channelId: string): Promise<ChannelReadState | null> {
    const { channel, isMember } = await this.access.requireReadAccess(member, channelId);
    return isMember ? this.state(channelId, member.id, channel.lastEntrySeq) : null;
  }

  async state(
    channelId: string,
    memberId: string,
    ceiling: bigint,
  ): Promise<ChannelReadState | null> {
    const seq = await this.repository.lastReadSeq(channelId, memberId);
    if (seq === null) return null;
    const unreadCount =
      seq < ceiling ? await this.repository.unreadCount(channelId, memberId, seq, ceiling) : 0;
    return { lastReadEntrySeq: seq.toString(), unreadCount };
  }

  async markRead(
    member: WorkspaceMember,
    channelId: string,
    seqText: string,
  ): Promise<ChannelReadState> {
    const { state, announce } = await this.advance(member, channelId, BigInt(seqText));
    announce();

    return state;
  }

  // Reading only moves forward: an older position leaves the cursor where it is, unannounced.
  @Transactional()
  private async advance(
    member: WorkspaceMember,
    channelId: string,
    seq: bigint,
  ): Promise<{ state: ChannelReadState; announce: Announce }> {
    const channel = await this.access.requirePostAccess(member, channelId);
    if (seq > channel.lastEntrySeq)
      throw new BadRequestException('Sequence exceeds channel history');

    const isEntry = seq === 0n || (await this.repository.entryExists(channelId, seq));
    if (!isEntry) throw new BadRequestException('Sequence is not an entry');

    const current = await this.repository.lastReadSeq(channelId, member.id);
    if (current === null) throw new ForbiddenException('Join this channel first');

    const isAhead = seq > current;
    if (isAhead) await this.repository.advance(channelId, member.id, seq);

    const state = await this.state(channelId, member.id, channel.lastEntrySeq);
    if (!state) throw new ForbiddenException('Join this channel first');
    if (!isAhead) return { state, announce: nothingToAnnounce };

    const event = new ReadStateAdvancedEvent(
      member.profile.oidcUserId,
      member.workspaceId,
      channelId,
      state,
    );
    return { state, announce: await this.events.record(READ_STATE_ADVANCED_EVENT, event) };
  }
}
