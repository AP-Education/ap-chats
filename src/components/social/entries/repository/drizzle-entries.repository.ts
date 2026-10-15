import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import { channelEntries, channels } from '@/database/drizzle/schema';

import type { ChannelEntry, EntryPosition } from '../types/entry.types';
import { EntriesRepository } from './entries.repository';

type Occupant = { messageId: string } | { callId: string };

@Injectable()
export class DrizzleEntriesRepository extends EntriesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  append(workspaceId: string, channelId: string, messageId: string): Promise<ChannelEntry> {
    return this.appendOne(workspaceId, channelId, { messageId });
  }

  appendCall(workspaceId: string, channelId: string, callId: string): Promise<ChannelEntry> {
    return this.appendOne(workspaceId, channelId, { callId });
  }

  async appendMany(
    workspaceId: string,
    channelId: string,
    messageIds: string[],
  ): Promise<EntryPosition[]> {
    if (!messageIds.length) return [];

    const lastSeq = await this.advance(workspaceId, channelId, messageIds.length);
    const firstSeq = lastSeq - BigInt(messageIds.length) + 1n;
    const entries = messageIds.map((messageId, index) => ({
      workspaceId,
      channelId,
      messageId,
      seq: firstSeq + BigInt(index),
    }));
    await this.txHost.tx.insert(channelEntries).values(entries);

    return entries.map(({ messageId, seq }) => ({ messageId, seq }));
  }

  private async appendOne(
    workspaceId: string,
    channelId: string,
    occupant: Occupant,
  ): Promise<ChannelEntry> {
    const seq = await this.advance(workspaceId, channelId, 1);
    const [entry] = await this.txHost.tx
      .insert(channelEntries)
      .values({ workspaceId, channelId, seq, ...occupant })
      .returning();
    if (!entry) throw new Error('Entry insert failed');

    return entry;
  }

  private async advance(workspaceId: string, channelId: string, count: number): Promise<bigint> {
    const [channel] = await this.txHost.tx
      .update(channels)
      .set({ lastEntrySeq: sql`${channels.lastEntrySeq} + ${count}`, updatedAt: new Date() })
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .returning({ lastSeq: channels.lastEntrySeq });
    if (!channel) throw new Error('Locked channel disappeared');

    return channel.lastSeq;
  }
}
