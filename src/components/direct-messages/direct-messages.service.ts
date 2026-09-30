import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, exists, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { WorkspaceMember } from '@/components/workspaces/members/types';
import {
  channelEntries,
  channelMemberships,
  channels,
  chatMessages,
  directMessages,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

type Cursor = { at: string; id: string };

function decodeCursor(value: string): Cursor {
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Cursor;
    if (!Number.isFinite(Date.parse(cursor.at)) || !/^[0-9a-f-]{36}$/i.test(cursor.id))
      throw new Error();
    return cursor;
  } catch {
    throw new ConflictException('Invalid conversation cursor');
  }
}

function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== 'object') return false;
    if ('code' in current && current.code === '23505') return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

@Injectable()
export class DirectMessagesService {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {}

  async findOrCreate(member: WorkspaceMember, targetMemberId: string) {
    if (member.id === targetMemberId)
      throw new ConflictException('Choose another workspace member');
    const [firstMemberId, secondMemberId] = [member.id, targetMemberId].sort();
    const target = await this.txHost.tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, member.workspaceId),
          eq(workspaceMembers.id, targetMemberId),
          eq(workspaceMembers.status, 'active'),
        ),
      );
    if (!target.length) throw new NotFoundException('Workspace member not found');

    const existing = await this.findPair(member.workspaceId, firstMemberId!, secondMemberId!);
    if (existing) return this.get(member, existing);
    try {
      const channelId = await this.createPair(
        member.workspaceId,
        member.id,
        targetMemberId,
        firstMemberId!,
        secondMemberId!,
      );
      return this.get(member, channelId);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const channelId = await this.findPair(member.workspaceId, firstMemberId!, secondMemberId!);
      if (!channelId) throw error;
      return this.get(member, channelId);
    }
  }

  @Transactional()
  private async createPair(
    workspaceId: string,
    memberId: string,
    targetMemberId: string,
    firstMemberId: string,
    secondMemberId: string,
  ): Promise<string> {
    const [channel] = await this.txHost.tx
      .insert(channels)
      .values({
        workspaceId,
        kind: 'dm',
        name: null,
        categoryId: null,
        createdByMemberId: memberId,
      })
      .returning({ id: channels.id });
    if (!channel) throw new Error('Direct message insert failed');
    await this.txHost.tx.insert(directMessages).values({
      workspaceId,
      channelId: channel.id,
      firstMemberId,
      secondMemberId,
    });
    await this.txHost.tx.insert(channelMemberships).values([
      { workspaceId, channelId: channel.id, memberId },
      { workspaceId, channelId: channel.id, memberId: targetMemberId },
    ]);
    return channel.id;
  }

  async get(member: WorkspaceMember, channelId: string) {
    const [row] = await this.baseQuery(member.id).where(
      and(
        eq(directMessages.channelId, channelId),
        eq(directMessages.workspaceId, member.workspaceId),
        or(
          eq(directMessages.firstMemberId, member.id),
          eq(directMessages.secondMemberId, member.id),
        ),
      ),
    );
    if (!row) throw new NotFoundException('Direct message not found');
    return this.toView(row, member.id);
  }

  async list(member: WorkspaceMember, before?: string) {
    const cursor = before ? decodeCursor(before) : null;
    const rows = await this.baseQuery(member.id)
      .where(
        and(
          eq(directMessages.workspaceId, member.workspaceId),
          or(
            eq(directMessages.firstMemberId, member.id),
            eq(directMessages.secondMemberId, member.id),
          ),
          gt(channels.lastEntrySeq, 0n),
          cursor
            ? or(
                lt(channels.updatedAt, new Date(cursor.at)),
                and(eq(channels.updatedAt, new Date(cursor.at)), lt(channels.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(channels.updatedAt), desc(channels.id))
      .limit(51);
    const page = rows.slice(0, 50);
    const last = page.at(-1);
    return {
      items: page.map((row) => this.toView(row, member.id)),
      nextCursor:
        rows.length > 50 && last
          ? Buffer.from(
              JSON.stringify({ at: last.channel.updatedAt.toISOString(), id: last.channel.id }),
            ).toString('base64url')
          : null,
    };
  }

  async unread(member: WorkspaceMember) {
    const unreadEntry = alias(channelEntries, 'dm_unread_entry');
    const unreadMessage = alias(chatMessages, 'dm_unread_message');
    const hasUnread = this.txHost.tx
      .select({ id: unreadEntry.id })
      .from(unreadEntry)
      .innerJoin(unreadMessage, eq(unreadMessage.id, unreadEntry.messageId))
      .where(
        and(
          eq(unreadEntry.channelId, channels.id),
          gt(unreadEntry.seq, channelMemberships.lastReadEntrySeq),
          ne(unreadMessage.authorMemberId, member.id),
          isNull(unreadMessage.deletedAt),
        ),
      );
    const candidates = await this.txHost.tx
      .select({ channelId: channels.id })
      .from(channelMemberships)
      .innerJoin(
        channels,
        and(eq(channels.id, channelMemberships.channelId), eq(channels.kind, 'dm')),
      )
      .innerJoin(directMessages, eq(directMessages.channelId, channels.id))
      .where(
        and(
          eq(channelMemberships.workspaceId, member.workspaceId),
          eq(channelMemberships.memberId, member.id),
          or(
            eq(directMessages.firstMemberId, member.id),
            eq(directMessages.secondMemberId, member.id),
          ),
          exists(hasUnread),
        ),
      )
      .orderBy(desc(channels.updatedAt), desc(channels.id))
      .limit(5);
    if (!candidates.length) return [];

    const ids = candidates.map(({ channelId }) => channelId);
    const [counts, conversations] = await Promise.all([
      this.txHost.tx
        .select({
          channelId: channelEntries.channelId,
          unreadCount: sql<number>`count(*)::integer`,
        })
        .from(channelEntries)
        .innerJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
        .innerJoin(
          channelMemberships,
          and(
            eq(channelMemberships.channelId, channelEntries.channelId),
            eq(channelMemberships.memberId, member.id),
          ),
        )
        .where(
          and(
            inArray(channelEntries.channelId, ids),
            gt(channelEntries.seq, channelMemberships.lastReadEntrySeq),
            ne(chatMessages.authorMemberId, member.id),
            isNull(chatMessages.deletedAt),
          ),
        )
        .groupBy(channelEntries.channelId),
      this.baseQuery(member.id).where(
        and(
          eq(directMessages.workspaceId, member.workspaceId),
          inArray(directMessages.channelId, ids),
          or(
            eq(directMessages.firstMemberId, member.id),
            eq(directMessages.secondMemberId, member.id),
          ),
        ),
      ),
    ]);
    const countById = new Map(counts.map((row) => [row.channelId, row.unreadCount]));
    const viewById = new Map(
      conversations.map((row) => [row.channel.id, this.toView(row, member.id)]),
    );
    return candidates.flatMap(({ channelId }) => {
      const view = viewById.get(channelId);
      const unreadCount = countById.get(channelId);
      return view && unreadCount ? [{ ...view, unreadCount }] : [];
    });
  }

  private async findPair(workspaceId: string, firstMemberId: string, secondMemberId: string) {
    const [row] = await this.txHost.tx
      .select({ channelId: directMessages.channelId })
      .from(directMessages)
      .where(
        and(
          eq(directMessages.workspaceId, workspaceId),
          eq(directMessages.firstMemberId, firstMemberId),
          eq(directMessages.secondMemberId, secondMemberId),
        ),
      );
    return row?.channelId;
  }

  async updateMute(
    member: WorkspaceMember,
    channelId: string,
    mode: 'unmute' | 'hour' | 'day' | 'indefinite',
  ) {
    await this.get(member, channelId);
    const mutedUntil =
      mode === 'hour'
        ? new Date(Date.now() + 60 * 60 * 1000)
        : mode === 'day'
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null;
    await this.txHost.tx
      .update(channelMemberships)
      .set({ notificationsMuted: mode === 'indefinite', mutedUntil })
      .where(
        and(
          eq(channelMemberships.workspaceId, member.workspaceId),
          eq(channelMemberships.channelId, channelId),
          eq(channelMemberships.memberId, member.id),
        ),
      );
    return this.get(member, channelId);
  }

  private baseQuery(viewerId: string) {
    const first = alias(workspaceMembers, 'dm_first');
    const second = alias(workspaceMembers, 'dm_second');
    const firstProfile = alias(userProfiles, 'dm_first_profile');
    const secondProfile = alias(userProfiles, 'dm_second_profile');
    const viewerMembership = alias(channelMemberships, 'dm_viewer_membership');
    return this.txHost.tx
      .select({
        channel: channels,
        notification: {
          muted: viewerMembership.notificationsMuted,
          mutedUntil: viewerMembership.mutedUntil,
        },
        first: {
          id: first.id,
          status: first.status,
          displayName: firstProfile.displayName,
          avatarPath: firstProfile.avatarPath,
        },
        second: {
          id: second.id,
          status: second.status,
          displayName: secondProfile.displayName,
          avatarPath: secondProfile.avatarPath,
        },
        lastMessage: {
          id: chatMessages.id,
          markdown: chatMessages.contentMarkdown,
          deletedAt: chatMessages.deletedAt,
          authorMemberId: chatMessages.authorMemberId,
          createdAt: chatMessages.createdAt,
        },
      })
      .from(directMessages)
      .innerJoin(channels, and(eq(channels.id, directMessages.channelId), eq(channels.kind, 'dm')))
      .innerJoin(
        viewerMembership,
        and(eq(viewerMembership.channelId, channels.id), eq(viewerMembership.memberId, viewerId)),
      )
      .innerJoin(first, eq(first.id, directMessages.firstMemberId))
      .innerJoin(second, eq(second.id, directMessages.secondMemberId))
      .innerJoin(firstProfile, eq(firstProfile.id, first.userProfileId))
      .innerJoin(secondProfile, eq(secondProfile.id, second.userProfileId))
      .leftJoin(
        channelEntries,
        and(
          eq(channelEntries.channelId, channels.id),
          eq(channelEntries.seq, channels.lastEntrySeq),
        ),
      )
      .leftJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .$dynamic();
  }

  private toView(
    row: Awaited<ReturnType<ReturnType<DirectMessagesService['baseQuery']>['execute']>>[number],
    viewerId: string,
  ) {
    const other = row.first.id === viewerId ? row.second : row.first;
    return {
      id: row.channel.id,
      workspaceId: row.channel.workspaceId,
      participant: {
        memberId: other.id,
        displayName: other.displayName,
        avatarPath: other.avatarPath,
        active: other.status === 'active',
      },
      notification: {
        isMuted:
          row.notification.muted ||
          Boolean(row.notification.mutedUntil && row.notification.mutedUntil > new Date()),
        mutedUntil: row.notification.mutedUntil,
      },
      lastMessage: row.lastMessage
        ? {
            id: row.lastMessage.id,
            markdown: row.lastMessage.deletedAt ? null : row.lastMessage.markdown,
            authorMemberId: row.lastMessage.authorMemberId,
            createdAt: row.lastMessage.createdAt,
          }
        : null,
      updatedAt: row.channel.updatedAt,
    };
  }
}
