import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, exists, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import {
  channelEntries,
  channelMemberships,
  channels,
  chatMessages,
  directMessages,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';

import type { ConversationRow, InboxCursor } from '../types';
import { DirectInboxRepository } from './direct-inbox.repository';

function participatesIn(viewerIds: string[]) {
  return or(
    inArray(directMessages.firstMemberId, viewerIds),
    inArray(directMessages.secondMemberId, viewerIds),
  );
}

@Injectable()
export class DrizzleDirectInboxRepository extends DirectInboxRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async memberIdsOf(userId: string): Promise<string[]> {
    const rows = await this.txHost.tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(and(eq(userProfiles.oidcUserId, userId), eq(workspaceMembers.status, 'active')));
    return rows.map((row) => row.id);
  }

  async find(viewerIds: string[], channelId: string): Promise<ConversationRow | undefined> {
    const [row] = await this.conversations(viewerIds).where(
      and(eq(directMessages.channelId, channelId), participatesIn(viewerIds)),
    );
    return row;
  }

  page(viewerIds: string[], cursor: InboxCursor | undefined, limit: number) {
    return this.conversations(viewerIds)
      .where(
        and(
          participatesIn(viewerIds),
          gt(channels.lastEntrySeq, 0n),
          cursor
            ? or(
                lt(channels.updatedAt, cursor.at),
                and(eq(channels.updatedAt, cursor.at), lt(channels.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(channels.updatedAt), desc(channels.id))
      .limit(limit);
  }

  async unread(viewerIds: string[], limit: number) {
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
          ne(unreadMessage.authorMemberId, channelMemberships.memberId),
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
          inArray(channelMemberships.memberId, viewerIds),
          participatesIn(viewerIds),
          exists(hasUnread),
        ),
      )
      .orderBy(desc(channels.updatedAt), desc(channels.id))
      .limit(limit);
    if (!candidates.length) return [];

    const ids = candidates.map(({ channelId }) => channelId);
    const [counts, rows] = await Promise.all([
      this.unreadCounts(viewerIds, ids),
      this.conversations(viewerIds).where(
        and(inArray(directMessages.channelId, ids), participatesIn(viewerIds)),
      ),
    ]);
    const countById = new Map(counts.map((count) => [count.channelId, count.unreadCount]));
    const rowById = new Map(rows.map((row) => [row.channel.id, row]));

    return candidates.flatMap(({ channelId }) => {
      const row = rowById.get(channelId);
      const unreadCount = countById.get(channelId);
      return row && unreadCount ? [{ row, unreadCount }] : [];
    });
  }

  private unreadCounts(viewerIds: string[], channelIds: string[]) {
    return this.txHost.tx
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
          inArray(channelMemberships.memberId, viewerIds),
        ),
      )
      .where(
        and(
          inArray(channelEntries.channelId, channelIds),
          gt(channelEntries.seq, channelMemberships.lastReadEntrySeq),
          ne(chatMessages.authorMemberId, channelMemberships.memberId),
          isNull(chatMessages.deletedAt),
        ),
      )
      .groupBy(channelEntries.channelId);
  }

  private conversations(viewerIds: string[]) {
    const first = alias(workspaceMembers, 'dm_first');
    const second = alias(workspaceMembers, 'dm_second');
    const firstProfile = alias(userProfiles, 'dm_first_profile');
    const secondProfile = alias(userProfiles, 'dm_second_profile');
    const viewerMembership = alias(channelMemberships, 'dm_viewer_membership');
    return this.txHost.tx
      .select({
        channel: {
          id: channels.id,
          workspaceId: channels.workspaceId,
          updatedAt: channels.updatedAt,
        },
        viewerId: viewerMembership.memberId,
        notification: {
          muted: viewerMembership.notificationsMuted,
          mutedUntil: viewerMembership.mutedUntil,
          level: viewerMembership.notificationLevel,
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
        and(
          eq(viewerMembership.channelId, channels.id),
          inArray(viewerMembership.memberId, viewerIds),
        ),
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
}
