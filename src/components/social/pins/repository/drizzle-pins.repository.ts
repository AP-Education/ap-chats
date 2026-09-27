import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { chatMessages, messagePins } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { MessagePin } from '../types/pin.types';
import { PinsRepository } from './pins.repository';

@Injectable()
export class DrizzlePinsRepository extends PinsRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  list(channelId: string): Promise<MessagePin[]> {
    return this.txHost.tx
      .select()
      .from(messagePins)
      .where(eq(messagePins.channelId, channelId))
      .orderBy(asc(messagePins.pinnedAt));
  }

  async find(channelId: string, messageId: string): Promise<MessagePin | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(messagePins)
      .where(and(eq(messagePins.channelId, channelId), eq(messagePins.messageId, messageId)));
    return row ?? null;
  }

  async messageIsAvailable(
    workspaceId: string,
    channelId: string,
    messageId: string,
  ): Promise<boolean> {
    const [row] = await this.txHost.tx
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.workspaceId, workspaceId),
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.id, messageId),
          isNull(chatMessages.deletedAt),
        ),
      );
    return !!row;
  }

  async insert(
    workspaceId: string,
    channelId: string,
    messageId: string,
    actorMemberId: string,
  ): Promise<MessagePin> {
    const [row] = await this.txHost.tx
      .insert(messagePins)
      .values({ workspaceId, channelId, messageId, pinnedByMemberId: actorMemberId })
      .returning();
    if (!row) throw new Error('Pin insert failed');
    return row;
  }

  async remove(channelId: string, messageId: string): Promise<boolean> {
    const rows = await this.txHost.tx
      .delete(messagePins)
      .where(and(eq(messagePins.channelId, channelId), eq(messagePins.messageId, messageId)))
      .returning();
    return rows.length > 0;
  }

  async removeForMessages(ids: string[]): Promise<void> {
    if (ids.length)
      await this.txHost.tx.delete(messagePins).where(inArray(messagePins.messageId, ids));
  }
}
