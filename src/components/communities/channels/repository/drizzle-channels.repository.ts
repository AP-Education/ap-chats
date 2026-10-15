import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, eq, sql } from 'drizzle-orm';

import { throwConflictOnUnique } from '@/database/drizzle/pg-errors';
import {
  channelGrants,
  channelMemberAccess,
  channelMemberships,
  channels,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { Channel, ListedChannel } from '../types';
import { ChannelsRepository } from './channels.repository';

@Injectable()
export class DrizzleChannelsRepository extends ChannelsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findListedFor(workspaceId: string, memberId: string): Promise<ListedChannel[]> {
    const rows = await this.selectAsSeenBy(memberId)
      .innerJoin(
        channelMemberships,
        and(
          eq(channelMemberships.channelId, channels.id),
          eq(channelMemberships.memberId, memberId),
        ),
      )
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.kind, 'channel')))
      .orderBy(asc(channels.name));
    return rows.map((row) => this.toListed(row));
  }

  async findAllAsSeenBy(workspaceId: string, memberId: string): Promise<ListedChannel[]> {
    const rows = await this.selectAsSeenBy(memberId)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.kind, 'channel')))
      .orderBy(asc(channels.name));
    return rows.map((row) => this.toListed(row));
  }

  async findById(workspaceId: string, channelId: string): Promise<Channel | undefined> {
    const [channel] = await this.txHost.tx
      .select()
      .from(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)));
    return channel && this.toModel(channel);
  }

  async findAsSeenBy(
    workspaceId: string,
    channelId: string,
    memberId: string,
  ): Promise<ListedChannel | undefined> {
    const [row] = await this.selectAsSeenBy(memberId).where(
      and(
        eq(channels.workspaceId, workspaceId),
        eq(channels.id, channelId),
        eq(channels.kind, 'channel'),
      ),
    );
    return row && this.toListed(row);
  }

  async create(
    workspaceId: string,
    creatorMemberId: string,
    values: { name: string; categoryId: string | null },
  ): Promise<Channel> {
    try {
      const [channel] = await this.txHost.tx
        .insert(channels)
        .values({ workspaceId, createdByMemberId: creatorMemberId, kind: 'channel', ...values })
        .returning();
      if (!channel) throw new Error('Channel insert did not return a row');
      return this.toModel(channel);
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
      const [channel] = await this.txHost.tx
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
    const [removed] = await this.txHost.tx
      .delete(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .returning({ id: channels.id });
    return Boolean(removed);
  }

  private selectAsSeenBy(memberId: string) {
    const isOpen = sql<boolean>`exists (select 1 from ${channelGrants} where ${channelGrants.channelId} = ${channels.id} and ${channelGrants.principal} = 'everyone')`;

    return this.txHost.tx
      .select({
        channel: channels,
        isOpen,
        canPost: channelMemberAccess.canPost,
        canManage: channelMemberAccess.canManage,
      })
      .from(channels)
      .leftJoin(
        channelMemberAccess,
        and(
          eq(channelMemberAccess.channelId, channels.id),
          eq(channelMemberAccess.memberId, memberId),
        ),
      )
      .$dynamic();
  }

  private toListed(row: {
    channel: typeof channels.$inferSelect;
    isOpen: boolean;
    canPost: boolean | null;
    canManage: boolean | null;
  }): ListedChannel {
    const listed =
      row.canPost === null ? null : { canPost: row.canPost, canManage: row.canManage ?? false };
    return { ...this.toModel(row.channel), isOpen: row.isOpen, listed };
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
