import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ReadStateRepository } from './repository/read-state.repository';

@Injectable()
export class ReadStateFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly repository: ReadStateRepository,
  ) {}

  @Transactional()
  workspace(member: WorkspaceMember) {
    return this.repository.workspaceSummary(member.workspaceId, member.id);
  }

  async cursor(channelId: string, memberId: string): Promise<{ lastReadEntrySeq: string } | null> {
    const seq = await this.repository.lastReadSeq(channelId, memberId);
    return seq === null ? null : { lastReadEntrySeq: seq.toString() };
  }

  @Transactional()
  async getState(member: WorkspaceMember, channelId: string) {
    const { channel, isMember } = await this.access.requireReadAccess(member, channelId);
    return isMember ? this.state(channelId, member.id, channel.lastEntrySeq) : null;
  }

  async state(channelId: string, memberId: string, ceiling: bigint) {
    const seq = await this.repository.lastReadSeq(channelId, memberId);
    if (seq === null) return null;
    return {
      lastReadEntrySeq: seq.toString(),
      unreadCount: await this.repository.unreadCount(channelId, memberId, seq, ceiling),
    };
  }

  @Transactional()
  async markRead(member: WorkspaceMember, channelId: string, seqText: string) {
    const seq = BigInt(seqText);
    const channel = await this.access.requirePostAccess(member, channelId);
    if (seq > channel.lastEntrySeq)
      throw new BadRequestException('Sequence exceeds channel history');
    if (seq > 0n && !(await this.repository.entryExists(channelId, seq)))
      throw new BadRequestException('Sequence is not an entry');
    const current = await this.repository.lastReadSeq(channelId, member.id);
    if (current === null) throw new ForbiddenException('Join this channel first');
    if (seq > current) await this.repository.advance(channelId, member.id, seq);
    return this.state(channelId, member.id, channel.lastEntrySeq);
  }
}
