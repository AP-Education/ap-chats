import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray, isNull, lt, ne, sql } from 'drizzle-orm';

import { chatMessages, chatUploads } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { Attachment, ChatUpload, ChatUploadPatch, NewChatUpload } from '../types';
import { ChatUploadsRepository } from './chat-uploads.repository';

type ChatUploadRow = typeof chatUploads.$inferSelect;

function toDomain(row: ChatUploadRow): ChatUpload {
  return { ...row, metadata: row.metadata ?? null };
}

@Injectable()
export class DrizzleChatUploadsRepository extends ChatUploadsRepository {
  constructor(private readonly host: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async lockOwner(memberId: string): Promise<void> {
    await this.host.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${'chat-uploads:' + memberId}, 0))`,
    );
  }

  async reservations(memberId: string): Promise<{ count: number; bytes: number }> {
    const [row] = await this.host.tx
      .select({
        count: sql<number>`count(*)::int`,
        bytes: sql<string>`coalesce(sum(${chatUploads.size}), 0)::text`,
      })
      .from(chatUploads)
      .where(and(eq(chatUploads.ownerMemberId, memberId), ne(chatUploads.state, 'attached')));
    return { count: row?.count ?? 0, bytes: Number(row?.bytes ?? 0) };
  }

  async insert(data: NewChatUpload): Promise<ChatUpload> {
    const [row] = await this.host.tx.insert(chatUploads).values(data).returning();
    if (!row) throw new Error('Upload insert failed');
    return toDomain(row);
  }

  async lock(id: string): Promise<ChatUpload | null> {
    const [row] = await this.host.tx
      .select()
      .from(chatUploads)
      .where(eq(chatUploads.id, id))
      .for('update');
    return row ? toDomain(row) : null;
  }

  async find(id: string): Promise<ChatUpload | null> {
    const [row] = await this.host.tx.select().from(chatUploads).where(eq(chatUploads.id, id));
    return row ? toDomain(row) : null;
  }

  async update(id: string, patch: ChatUploadPatch): Promise<void> {
    await this.host.tx.update(chatUploads).set(patch).where(eq(chatUploads.id, id));
  }

  async lockMany(ids: string[]): Promise<ChatUpload[]> {
    if (!ids.length) return [];
    const rows = await this.host.tx
      .select()
      .from(chatUploads)
      .where(inArray(chatUploads.id, ids))
      .orderBy(chatUploads.id)
      .for('update');
    return rows.map(toDomain);
  }

  async attach(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.host.tx
      .update(chatUploads)
      .set({ state: 'attached', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
      .where(inArray(chatUploads.id, ids));
  }

  async message(
    workspaceId: string,
    channelId: string,
    messageId: string,
  ): Promise<{ attachments: Attachment[] } | null> {
    const [row] = await this.host.tx
      .select({ attachments: chatMessages.attachments })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.workspaceId, workspaceId),
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.id, messageId),
          isNull(chatMessages.deletedAt),
        ),
      );
    return row ?? null;
  }

  async expired(): Promise<ChatUpload[]> {
    const rows = await this.host.tx
      .select()
      .from(chatUploads)
      .where(lt(chatUploads.expiresAt, new Date()))
      .orderBy(chatUploads.expiresAt)
      .limit(50);
    return rows.map(toDomain);
  }

  async remove(id: string): Promise<void> {
    await this.host.tx.delete(chatUploads).where(eq(chatUploads.id, id));
  }

  async hasLiveReferences(id: string): Promise<boolean> {
    const [row] = await this.host.tx
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          isNull(chatMessages.deletedAt),
          sql`${chatMessages.attachments} @> ${JSON.stringify([{ id }])}::jsonb`,
        ),
      )
      .limit(1);
    return Boolean(row);
  }
}
