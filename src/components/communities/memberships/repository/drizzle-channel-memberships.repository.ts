import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, eq } from 'drizzle-orm';

import { channelMemberships, channels, workspaceMembers } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ChannelMembership } from '../types';
import { ChannelMembershipsRepository } from './channel-memberships.repository';

@Injectable()
export class DrizzleChannelMembershipsRepository extends ChannelMembershipsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findAllActiveForChannel(channelId: string): Promise<ChannelMembership[]> {
    const rows = await this.txHost.tx
      .select({
        workspaceId: channelMemberships.workspaceId,
        channelId: channelMemberships.channelId,
        memberId: channelMemberships.memberId,
        joinedAt: channelMemberships.joinedAt,
      })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(workspaceMembers.status, 'active')),
      );
    return rows.map((row) => this.toModel(row));
  }

  async isMember(channelId: string, memberId: string): Promise<boolean> {
    const [membership] = await this.txHost.tx
      .select({ memberId: channelMemberships.memberId })
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    return !!membership;
  }

  @Transactional()
  async joinPublic(
    workspaceId: string,
    channelId: string,
    memberId: string,
  ): Promise<ChannelMembership> {
    const [channel] = await this.txHost.tx
      .select()
      .from(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .for('update');
    if (!channel || channel.kind !== 'public')
      throw new NotFoundException('Public channel not found');
    const [activeMember] = await this.txHost.tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.status, 'active'),
        ),
      )
      .for('share');
    if (!activeMember) throw new NotFoundException('Workspace member not found');
    await this.txHost.tx
      .insert(channelMemberships)
      .values({ workspaceId, channelId, memberId, lastReadEntrySeq: channel.lastEntrySeq })
      .onConflictDoNothing();
    const [membership] = await this.txHost.tx
      .select()
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    if (!membership) throw new Error('Membership insert did not return a row');
    return this.toModel(membership);
  }

  @Transactional()
  async add(workspaceId: string, channelId: string, memberId: string): Promise<ChannelMembership> {
    const [channel] = await this.txHost.tx
      .select()
      .from(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .for('update');
    if (!channel) throw new NotFoundException('Channel not found');
    const [target] = await this.txHost.tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.status, 'active'),
        ),
      )
      .for('share');
    if (!target) throw new NotFoundException('Workspace member not found');
    await this.txHost.tx
      .insert(channelMemberships)
      .values({ workspaceId, channelId, memberId, lastReadEntrySeq: channel.lastEntrySeq })
      .onConflictDoNothing();
    const [membership] = await this.txHost.tx
      .select()
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    if (!membership) throw new Error('Membership insert did not return a row');
    return this.toModel(membership);
  }

  @Transactional()
  async remove(workspaceId: string, channelId: string, memberId: string): Promise<boolean> {
    const [channel] = await this.txHost.tx
      .select({ id: channels.id, kind: channels.kind })
      .from(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .for('update');
    if (!channel) throw new NotFoundException('Channel not found');
    const [membership] = await this.txHost.tx
      .select({ memberId: channelMemberships.memberId })
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    if (!membership) return false;
    if (channel.kind === 'private') {
      const active = await this.txHost.tx
        .select({ memberId: channelMemberships.memberId })
        .from(channelMemberships)
        .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
        .where(
          and(eq(channelMemberships.channelId, channelId), eq(workspaceMembers.status, 'active')),
        );
      if (active.length <= 1 && active.some((row) => row.memberId === memberId))
        throw new ConflictException('Private channel must keep an active member');
    }
    await this.txHost.tx
      .delete(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    return true;
  }

  private toModel(
    row: Pick<
      typeof channelMemberships.$inferSelect,
      'workspaceId' | 'channelId' | 'memberId' | 'joinedAt'
    >,
  ): ChannelMembership {
    return {
      workspaceId: row.workspaceId,
      channelId: row.channelId,
      memberId: row.memberId,
      joinedAt: row.joinedAt,
    };
  }
}
