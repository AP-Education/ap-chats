import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, gt, gte, isNull, lte, ne, or, sql } from 'drizzle-orm';

import { activeDmPair } from '@/components/communities/channel-access';
import type { DrizzleTransactionAdapter } from '@/database/drizzle';
import {
  channelEntries,
  channelMemberships,
  channels,
  chatMessages,
  messageMentions,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';

import {
  PushAudienceRepository,
  type PushRecipient,
  type PushScope,
} from './push-audience.repository';

@Injectable()
export class DrizzlePushAudienceRepository extends PushAudienceRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async context(scope: PushScope) {
    const [row] = await this.txHost.tx
      .select({ name: channels.name, kind: channels.kind, lastSeq: channels.lastEntrySeq })
      .from(channels)
      .where(
        and(
          eq(channels.id, scope.channelId),
          eq(channels.workspaceId, scope.workspaceId),
          or(ne(channels.kind, 'dm'), activeDmPair(channels.id)),
        ),
      );
    return row;
  }

  recipients(scope: PushScope, after?: string, memberId?: string) {
    const mentioned = sql<boolean>`exists (select 1 from ${messageMentions}
      join ${chatMessages} on ${chatMessages.id} = ${messageMentions.messageId}
      join ${channelEntries} on ${channelEntries.messageId} = ${messageMentions.messageId}
      where ${messageMentions.memberId} = ${channelMemberships.memberId}
      and ${channelEntries.channelId} = ${scope.channelId}
      and ${channelEntries.seq} between ${scope.firstSeq}::bigint and ${scope.lastSeq}::bigint
      and ${chatMessages.deletedAt} is null and ${chatMessages.authorMemberId} <> ${channelMemberships.memberId}
      and ${channelEntries.seq} > ${channelMemberships.lastReadEntrySeq})`;
    return this.txHost.tx
      .select({
        lastReadEntrySeq: channelMemberships.lastReadEntrySeq,
        memberId: workspaceMembers.id,
        userId: userProfiles.oidcUserId,
        level: channelMemberships.notificationLevel,
        notificationsMuted: channelMemberships.notificationsMuted,
        mutedUntil: channelMemberships.mutedUntil,
        mentioned,
      })
      .from(channelMemberships)
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, channelMemberships.memberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(channelMemberships.workspaceId, scope.workspaceId),
          eq(channelMemberships.channelId, scope.channelId),
          eq(workspaceMembers.status, 'active'),
          gt(sql`${scope.lastSeq}::bigint`, channelMemberships.lastReadEntrySeq),
          after ? gt(workspaceMembers.id, after) : undefined,
          memberId ? eq(workspaceMembers.id, memberId) : undefined,
        ),
      )
      .orderBy(workspaceMembers.id)
      .limit(memberId ? 1 : 100);
  }

  async lastCreatedAt(scope: PushScope): Promise<Date | undefined> {
    const [row] = await this.txHost.tx
      .select({ createdAt: chatMessages.createdAt })
      .from(channelEntries)
      .innerJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .where(
        and(
          eq(channelEntries.channelId, scope.channelId),
          gte(channelEntries.seq, BigInt(scope.firstSeq)),
          lte(channelEntries.seq, BigInt(scope.lastSeq)),
          isNull(chatMessages.deletedAt),
        ),
      )
      .orderBy(desc(channelEntries.seq))
      .limit(1);
    return row?.createdAt;
  }

  async latestMessage(scope: PushScope, recipient: PushRecipient, mentionsOnly: boolean) {
    const [row] = await this.txHost.tx
      .select({
        contentMarkdown: chatMessages.contentMarkdown,
        actorName: userProfiles.displayName,
      })
      .from(channelEntries)
      .innerJoin(chatMessages, eq(chatMessages.id, channelEntries.messageId))
      .innerJoin(workspaceMembers, eq(workspaceMembers.id, chatMessages.authorMemberId))
      .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
      .where(
        and(
          eq(channelEntries.channelId, scope.channelId),
          eq(channelEntries.workspaceId, scope.workspaceId),
          gte(channelEntries.seq, BigInt(scope.firstSeq)),
          lte(channelEntries.seq, BigInt(scope.lastSeq)),
          gt(channelEntries.seq, recipient.lastReadEntrySeq),
          isNull(chatMessages.deletedAt),
          ne(chatMessages.authorMemberId, recipient.memberId),
          mentionsOnly
            ? sql`exists (select 1 from ${messageMentions} where ${messageMentions.messageId} = ${chatMessages.id} and ${messageMentions.memberId} = ${recipient.memberId})`
            : undefined,
        ),
      )
      .orderBy(desc(channelEntries.seq))
      .limit(1);
    return row;
  }
}
