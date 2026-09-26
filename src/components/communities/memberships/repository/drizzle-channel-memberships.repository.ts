import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DrizzleService } from '@/database/drizzle';
import { channelMemberships, channels, workspaceMembers } from '@/database/drizzle/schema';

import type { ChannelMembership } from '../types';
import { ChannelMembershipsRepository } from './channel-memberships.repository';

@Injectable()
export class DrizzleChannelMembershipsRepository extends ChannelMembershipsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async findAllActiveForChannel(channelId: string): Promise<ChannelMembership[]> {
    const rows = await this.drizzle.db
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
    const [membership] = await this.drizzle.db
      .select({ memberId: channelMemberships.memberId })
      .from(channelMemberships)
      .where(
        and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.memberId, memberId)),
      );
    return !!membership;
  }

  joinPublic(workspaceId: string, channelId: string, memberId: string): Promise<ChannelMembership> {
    return this.drizzle.db.transaction(async (tx) => {
      const [channel] = await tx
        .select()
        .from(channels)
        .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
        .for('update');
      if (!channel || channel.kind !== 'public')
        throw new NotFoundException('Public channel not found');
      await tx
        .insert(channelMemberships)
        .values({ workspaceId, channelId, memberId })
        .onConflictDoNothing();
      const [membership] = await tx
        .select()
        .from(channelMemberships)
        .where(
          and(
            eq(channelMemberships.channelId, channelId),
            eq(channelMemberships.memberId, memberId),
          ),
        );
      if (!membership) throw new Error('Membership insert did not return a row');
      return this.toModel(membership);
    });
  }

  add(workspaceId: string, channelId: string, memberId: string): Promise<ChannelMembership> {
    return this.drizzle.db.transaction(async (tx) => {
      const [channel] = await tx
        .select()
        .from(channels)
        .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
        .for('update');
      if (!channel) throw new NotFoundException('Channel not found');
      const [target] = await tx
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
      await tx
        .insert(channelMemberships)
        .values({ workspaceId, channelId, memberId })
        .onConflictDoNothing();
      const [membership] = await tx
        .select()
        .from(channelMemberships)
        .where(
          and(
            eq(channelMemberships.channelId, channelId),
            eq(channelMemberships.memberId, memberId),
          ),
        );
      if (!membership) throw new Error('Membership insert did not return a row');
      return this.toModel(membership);
    });
  }

  remove(workspaceId: string, channelId: string, memberId: string): Promise<boolean> {
    return this.drizzle.db.transaction(async (tx) => {
      const [channel] = await tx
        .select({ id: channels.id, kind: channels.kind })
        .from(channels)
        .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
        .for('update');
      if (!channel) throw new NotFoundException('Channel not found');
      const [membership] = await tx
        .select({ memberId: channelMemberships.memberId })
        .from(channelMemberships)
        .where(
          and(
            eq(channelMemberships.channelId, channelId),
            eq(channelMemberships.memberId, memberId),
          ),
        );
      if (!membership) return false;
      if (channel.kind === 'private') {
        const active = await tx
          .select({ memberId: channelMemberships.memberId })
          .from(channelMemberships)
          .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
          .where(
            and(eq(channelMemberships.channelId, channelId), eq(workspaceMembers.status, 'active')),
          );
        if (active.length <= 1 && active.some((row) => row.memberId === memberId))
          throw new ConflictException('Private channel must keep an active member');
      }
      await tx
        .delete(channelMemberships)
        .where(
          and(
            eq(channelMemberships.channelId, channelId),
            eq(channelMemberships.memberId, memberId),
          ),
        );
      return true;
    });
  }

  private toModel(row: typeof channelMemberships.$inferSelect): ChannelMembership {
    return {
      workspaceId: row.workspaceId,
      channelId: row.channelId,
      memberId: row.memberId,
      joinedAt: row.joinedAt,
    };
  }
}
