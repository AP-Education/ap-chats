import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { ChannelAccessSnapshot } from '@/components/communities/channel-access/channel-access/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { READ_RECEIPT_EVENT, ReadReceiptEvent } from './events/read-receipt.event';
import {
  READ_STATE_ADVANCED_EVENT,
  ReadStateAdvancedEvent,
} from './events/read-state-advanced.event';
import { sharesReadReceipts } from './read-receipts.rules';
import { ReadStateRepository } from './repository/read-state.repository';
import type { ChannelReadState, WorkspaceChannelUnread } from './types';

@Injectable()
export class ReadStateService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly repository: ReadStateRepository,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  workspace(member: WorkspaceMember): Promise<WorkspaceChannelUnread[]> {
    return this.repository.workspaceSummary(member.workspaceId, member.id);
  }

  @Transactional()
  async getState(member: WorkspaceMember, channelId: string): Promise<ChannelReadState | null> {
    const channel = await this.access.requireViewAccess(member, channelId);
    return this.state(channelId, member.id, channel.lastEntrySeq);
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

  /** How far the others in the channel have read, where read receipts are shared. */
  async peerReadSeq(channel: ChannelAccessSnapshot, memberId: string): Promise<bigint | null> {
    if (!sharesReadReceipts(channel.kind)) return null;

    return this.repository.furthestReadByOthers(channel.id, memberId);
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
    const channel = await this.access.requireMembership(member, channelId);
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

    return { state, announce: await this.announceAdvance(member, channel, state) };
  }

  // The reader's own devices always follow; the others only where read receipts are shared.
  private async announceAdvance(
    member: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    state: ChannelReadState,
  ): Promise<Announce> {
    const advanced = new ReadStateAdvancedEvent(
      member.profile.oidcUserId,
      member.workspaceId,
      channel.id,
      state,
    );
    const announceAdvanced = await this.events.record(READ_STATE_ADVANCED_EVENT, advanced);
    if (!sharesReadReceipts(channel.kind)) return announceAdvanced;

    const receipt = new ReadReceiptEvent(
      member.workspaceId,
      channel.id,
      member.id,
      state.lastReadEntrySeq,
    );
    const announceReceipt = await this.events.record(READ_RECEIPT_EVENT, receipt);

    return () => {
      announceAdvanced();
      announceReceipt();
    };
  }
}
