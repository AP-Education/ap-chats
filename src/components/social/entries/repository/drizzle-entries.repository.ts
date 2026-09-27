import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, sql } from 'drizzle-orm';

import { channelEntries, channels } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { ChannelEntry, EntryPosition } from '../types/entry.types';
import { EntriesRepository } from './entries.repository';

@Injectable()
export class DrizzleEntriesRepository extends EntriesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async append(workspaceId: string, channelId: string, messageId: string): Promise<ChannelEntry> {
    const [channel] = await this.txHost.tx
      .update(channels)
      .set({ lastEntrySeq: sql`${channels.lastEntrySeq} + 1`, updatedAt: new Date() })
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .returning({ seq: channels.lastEntrySeq });
    if (!channel) throw new Error('Locked channel disappeared');
    const [entry] = await this.txHost.tx
      .insert(channelEntries)
      .values({ workspaceId, channelId, messageId, seq: channel.seq })
      .returning();
    if (!entry) throw new Error('Entry insert failed');
    return entry;
  }

  async appendMany(
    workspaceId: string,
    channelId: string,
    messageIds: string[],
  ): Promise<EntryPosition[]> {
    if (!messageIds.length) return [];
    const [channel] = await this.txHost.tx
      .update(channels)
      .set({
        lastEntrySeq: sql`${channels.lastEntrySeq} + ${messageIds.length}`,
        updatedAt: new Date(),
      })
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId)))
      .returning({ lastSeq: channels.lastEntrySeq });
    if (!channel) throw new Error('Locked channel disappeared');

    const firstSeq = channel.lastSeq - BigInt(messageIds.length) + 1n;
    const entries = messageIds.map((messageId, index) => ({
      workspaceId,
      channelId,
      messageId,
      seq: firstSeq + BigInt(index),
    }));
    await this.txHost.tx.insert(channelEntries).values(entries);
    return entries.map(({ messageId, seq }) => ({ messageId, seq }));
  }
}
