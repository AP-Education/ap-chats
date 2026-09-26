import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNotNull, or } from 'drizzle-orm';

import { DrizzleService } from '@/database/drizzle';
import { channelMemberships, channels } from '@/database/drizzle/schema';

import { throwConflictOnUnique } from '../../repository/pg-unique-conflict';
import type { Channel, ChannelView } from '../types';
import { ChannelsRepository } from './channels.repository';

@Injectable()
export class DrizzleChannelsRepository extends ChannelsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async findAllForMember(
    workspaceId: string,
    memberId: string,
    scope: 'available' | 'joined',
  ): Promise<ChannelView[]> {
    const rows = await this.drizzle.db
      .select({ channel: channels, membership: channelMemberships })
      .from(channels)
      .leftJoin(
        channelMemberships,
        and(
          eq(channelMemberships.channelId, channels.id),
          eq(channelMemberships.memberId, memberId),
        ),
      )
      .where(
        and(
          eq(channels.workspaceId, workspaceId),
          scope === 'joined'
            ? isNotNull(channelMemberships.memberId)
            : or(eq(channels.kind, 'public'), isNotNull(channelMemberships.memberId)),
        ),
      )
      .orderBy(asc(channels.name));
    return rows.map(({ channel, membership }) => ({
      ...this.toModel(channel),
      isMember: !!membership,
    }));
  }

  async findById(workspaceId: string, channelId: string): Promise<Channel | undefined> {
    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)));
    return channel && this.toModel(channel);
  }

  async create(
    workspaceId: string,
    creatorMemberId: string,
    values: { name: string; kind: Channel['kind']; categoryId: string | null },
  ): Promise<Channel> {
    try {
      return await this.drizzle.db.transaction(async (tx) => {
        const [channel] = await tx
          .insert(channels)
          .values({ workspaceId, createdByMemberId: creatorMemberId, ...values })
          .returning();
        if (!channel) throw new Error('Channel insert did not return a row');
        await tx
          .insert(channelMemberships)
          .values({ workspaceId, channelId: channel.id, memberId: creatorMemberId });
        return this.toModel(channel);
      });
    } catch (error) {
      return throwConflictOnUnique(error, 'Channel name already exists');
    }
  }

  async update(
    workspaceId: string,
    channelId: string,
    changes: { name?: string; categoryId?: string | null },
  ): Promise<Channel | undefined> {
    try {
      const [channel] = await this.drizzle.db
        .update(channels)
        .set({ ...changes, updatedAt: new Date() })
        .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
        .returning();
      return channel && this.toModel(channel);
    } catch (error) {
      return throwConflictOnUnique(error, 'Channel name already exists');
    }
  }

  async remove(workspaceId: string, channelId: string): Promise<boolean> {
    const [removed] = await this.drizzle.db
      .delete(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .returning({ id: channels.id });
    return Boolean(removed);
  }

  private toModel(row: typeof channels.$inferSelect): Channel {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      categoryId: row.categoryId,
      kind: row.kind,
      name: row.name,
      createdByMemberId: row.createdByMemberId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
