import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, desc, eq, gt, gte, isNull, lte, ne, or, type SQL, sql } from 'drizzle-orm';

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

import type { ConversationRange, ConversationScope } from '../types';
import {
  PushAudienceRepository,
  type PushRecipient,
  RECIPIENTS_PAGE_SIZE,
} from './push-audience.repository';

@Injectable()
export class DrizzlePushAudienceRepository extends PushAudienceRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async conversation(scope: ConversationScope) {
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

  recipients(range: ConversationRange, after?: string) {
    return this.recipientsWhere(range, after ? gt(workspaceMembers.id, after) : undefined).limit(
      RECIPIENTS_PAGE_SIZE,
    );
  }

  async memberRecipient(range: ConversationRange, memberId: string) {
    const [row] = await this.recipientsWhere(range, eq(workspaceMembers.id, memberId)).limit(1);
    return row;
  }

  async latestMessageAt(scope: ConversationRange): Promise<Date | undefined> {
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

  async latestMessage(scope: ConversationRange, recipient: PushRecipient, mentionsOnly: boolean) {
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

  private recipientsWhere(scope: ConversationRange, member: SQL | undefined) {
    return this.txHost.tx
      .select({
        lastReadEntrySeq: channelMemberships.lastReadEntrySeq,
        memberId: workspaceMembers.id,
        userId: userProfiles.oidcUserId,
        level: channelMemberships.notificationLevel,
        notificationsMuted: channelMemberships.notificationsMuted,
        mutedUntil: channelMemberships.mutedUntil,
        mentioned: unreadFromOthers(scope, { mentionsOnly: true }),
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
          unreadFromOthers(scope, { mentionsOnly: false }),
          member,
        ),
      )
      .orderBy(workspaceMembers.id);
  }
}

// Someone else's surviving message in the range that this member has not read yet.
function unreadFromOthers(scope: ConversationRange, { mentionsOnly }: { mentionsOnly: boolean }) {
  const mention = mentionsOnly
    ? sql`and exists (select 1 from ${messageMentions} where ${messageMentions.messageId} = ${chatMessages.id}
      and ${messageMentions.memberId} = ${channelMemberships.memberId})`
    : sql``;

  return sql<boolean>`exists (select 1 from ${channelEntries}
    join ${chatMessages} on ${chatMessages.id} = ${channelEntries.messageId}
    where ${channelEntries.channelId} = ${scope.channelId}
    and ${channelEntries.seq} between ${scope.firstSeq}::bigint and ${scope.lastSeq}::bigint
    and ${channelEntries.seq} > ${channelMemberships.lastReadEntrySeq}
    and ${chatMessages.deletedAt} is null
    and ${chatMessages.authorMemberId} <> ${channelMemberships.memberId} ${mention})`;
}
