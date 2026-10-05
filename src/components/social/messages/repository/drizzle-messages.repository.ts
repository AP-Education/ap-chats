import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { channelEntries, chatMessages } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type {
  CreateMessageRecord,
  ForwardMessageRecord,
  MessageModel,
  MessageWithSeq,
} from '../types/message.types';
import { MessagesRepository } from './messages.repository';

@Injectable()
export class DrizzleMessagesRepository extends MessagesRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findByNonce(
    channelId: string,
    authorMemberId: string,
    clientNonce: string,
  ): Promise<MessageModel | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.authorMemberId, authorMemberId),
          eq(chatMessages.clientNonce, clientNonce),
        ),
      );
    return row ?? null;
  }

  async findById(workspaceId: string, channelId: string, id: string): Promise<MessageModel | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.workspaceId, workspaceId),
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.id, id),
        ),
      );
    return row ?? null;
  }

  async findMany(channelId: string, ids: string[]): Promise<MessageModel[]> {
    if (!ids.length) return [];
    return this.txHost.tx
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.channelId, channelId), inArray(chatMessages.id, ids)));
  }

  async findWithEntries(channelId: string, ids: string[]): Promise<MessageWithSeq[]> {
    if (!ids.length) return [];
    return this.txHost.tx
      .select({ message: chatMessages, seq: channelEntries.seq })
      .from(chatMessages)
      .innerJoin(channelEntries, eq(channelEntries.messageId, chatMessages.id))
      .where(and(eq(chatMessages.channelId, channelId), inArray(chatMessages.id, ids)));
  }

  async entrySeq(messageId: string): Promise<bigint> {
    const [entry] = await this.txHost.tx
      .select({ seq: channelEntries.seq })
      .from(channelEntries)
      .where(eq(channelEntries.messageId, messageId));
    if (!entry) throw new Error('Message entry missing');
    return entry.seq;
  }

  async insert(data: CreateMessageRecord): Promise<MessageModel> {
    const [row] = await this.txHost.tx.insert(chatMessages).values(data).returning();
    if (!row) throw new Error('Message insert failed');
    return row;
  }

  async insertForwardBatch(
    workspaceId: string,
    channelId: string,
    authorMemberId: string,
    sources: ForwardMessageRecord[],
    requestDigest: string,
  ): Promise<MessageModel[]> {
    if (!sources.length) return [];
    const records = sources.map((source) => ({
      id: randomUUID(),
      workspaceId,
      channelId,
      authorMemberId,
      contentMarkdown: source.contentMarkdown,
      attachments: source.attachments,
      forwardedFromMessageId: source.sourceMessageId,
      forwardedFromMemberId: source.sourceAuthorMemberId,
      requestDigest,
      clientNonce: source.clientNonce,
    }));
    const inserted = await this.txHost.tx.insert(chatMessages).values(records).returning();
    const byId = new Map(inserted.map((message) => [message.id, message]));
    return records.map(({ id }) => {
      const message = byId.get(id);
      if (!message) throw new Error('Forward batch message missing');
      return message;
    });
  }

  async updateContent(id: string, markdown: string, nextRevision: number): Promise<MessageModel> {
    const [row] = await this.txHost.tx
      .update(chatMessages)
      .set({ contentMarkdown: markdown, revision: nextRevision, editedAt: new Date() })
      .where(eq(chatMessages.id, id))
      .returning();
    if (!row) throw new Error('Message update failed');
    return row;
  }

  async tombstone(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.txHost.tx
      .update(chatMessages)
      .set({
        contentMarkdown: '',
        attachments: [],
        deletedAt: new Date(),
        revision: sql`${chatMessages.revision} + 1`,
      })
      .where(inArray(chatMessages.id, ids));
  }
}
