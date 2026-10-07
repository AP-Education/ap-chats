import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import {
  READ_STATE_ADVANCED_EVENT,
  ReadStateAdvancedEvent,
} from './events/read-state-advanced.event';
import { ReadStateRepository } from './repository/read-state.repository';
import type { ChannelReadState, MarkReadOutcome, WorkspaceChannelUnread } from './types';

@Injectable()
export class ReadStateFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly repository: ReadStateRepository,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  workspace(member: WorkspaceMember): Promise<WorkspaceChannelUnread[]> {
    return this.repository.workspaceSummary(member.workspaceId, member.id);
  }

  async cursor(channelId: string, memberId: string): Promise<{ lastReadEntrySeq: string } | null> {
    const seq = await this.repository.lastReadSeq(channelId, memberId);
    return seq === null ? null : { lastReadEntrySeq: seq.toString() };
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
    return {
      lastReadEntrySeq: seq.toString(),
      unreadCount: await this.repository.unreadCount(channelId, memberId, seq, ceiling),
    };
  }

  async markRead(
    member: WorkspaceMember,
    channelId: string,
    seqText: string,
  ): Promise<ChannelReadState> {
    const outcome = await this.markReadTransaction(member, channelId, seqText);
    if (outcome.advanced) {
      this.events.publish(
        READ_STATE_ADVANCED_EVENT,
        new ReadStateAdvancedEvent(
          member.profile.oidcUserId,
          member.workspaceId,
          channelId,
          outcome.state,
        ),
      );
    }
    return outcome.state;
  }

  @Transactional()
  private async markReadTransaction(
    member: WorkspaceMember,
    channelId: string,
    seqText: string,
  ): Promise<MarkReadOutcome> {
    const seq = BigInt(seqText);
    const channel = await this.access.requirePostAccess(member, channelId);
    if (seq > channel.lastEntrySeq)
      throw new BadRequestException('Sequence exceeds channel history');
    if (seq > 0n && !(await this.repository.entryExists(channelId, seq)))
      throw new BadRequestException('Sequence is not an entry');
    const current = await this.repository.lastReadSeq(channelId, member.id);
    if (current === null) throw new ForbiddenException('Join this channel first');
    const advanced = seq > current;
    if (advanced) await this.repository.advance(channelId, member.id, seq);
    const state = await this.state(channelId, member.id, channel.lastEntrySeq);
    if (!state) throw new ForbiddenException('Join this channel first');
    return { state, advanced };
  }
}
