import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, asc, eq, exists, ilike, ne, notExists, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { WorkspaceMember } from '@/components/workspaces/members/types';
import {
  channelMemberships,
  channels,
  directMessages,
  userProfiles,
  workspaceMembers,
} from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import { ConversationSearchRepository } from './conversation-search.repository';
import { type ConversationSearchResults, SEARCH_GROUP_LIMIT } from './types';

@Injectable()
export class DrizzleConversationSearchRepository extends ConversationSearchRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async find(member: WorkspaceMember, query: string): Promise<ConversationSearchResults> {
    const literal = query.replace(/[\\%_]/gu, '\\$&');
    const pattern = `%${literal}%`;
    const viewer = alias(workspaceMembers, 'search_viewer');
    const activeViewer = exists(
      this.txHost.tx
        .select({ id: viewer.id })
        .from(viewer)
        .where(
          and(
            eq(viewer.id, member.id),
            eq(viewer.workspaceId, member.workspaceId),
            eq(viewer.status, 'active'),
          ),
        ),
    );
    const order = (name: typeof userProfiles.displayName | typeof channels.name) => [
      sql`case when lower(${name}) = lower(${query}) then 0 when ${name} ilike ${`${literal}%`} then 1 else 2 end`,
      asc(name),
    ];

    const ownPair = or(
      eq(directMessages.firstMemberId, member.id),
      eq(directMessages.secondMemberId, member.id),
    );
    const alreadyInConversation = this.txHost.tx
      .select({ id: directMessages.channelId })
      .from(directMessages)
      .innerJoin(
        channelMemberships,
        and(
          eq(channelMemberships.channelId, directMessages.channelId),
          eq(channelMemberships.memberId, member.id),
        ),
      )
      .where(
        and(
          eq(directMessages.workspaceId, member.workspaceId),
          ownPair,
          or(
            eq(directMessages.firstMemberId, workspaceMembers.id),
            eq(directMessages.secondMemberId, workspaceMembers.id),
          ),
        ),
      );

    const [foundChannels, conversations, people] = await Promise.all([
      this.txHost.tx
        .select({ id: channels.id, name: sql<string>`${channels.name}` })
        .from(channels)
        .innerJoin(
          channelMemberships,
          and(
            eq(channelMemberships.channelId, channels.id),
            eq(channelMemberships.memberId, member.id),
          ),
        )
        .where(
          and(
            activeViewer,
            eq(channels.workspaceId, member.workspaceId),
            eq(channels.kind, 'channel'),
            ilike(channels.name, pattern),
          ),
        )
        .orderBy(...order(channels.name), asc(channels.id))
        .limit(SEARCH_GROUP_LIMIT),
      this.txHost.tx
        .select({
          id: directMessages.channelId,
          participant: {
            memberId: workspaceMembers.id,
            displayName: userProfiles.displayName,
            avatarPath: userProfiles.avatarPath,
            isBot: userProfiles.isBot,
            active: sql<boolean>`${workspaceMembers.status} = 'active'`,
          },
        })
        .from(directMessages)
        .innerJoin(
          channelMemberships,
          and(
            eq(channelMemberships.channelId, directMessages.channelId),
            eq(channelMemberships.memberId, member.id),
          ),
        )
        .innerJoin(
          workspaceMembers,
          eq(
            workspaceMembers.id,
            sql`case when ${directMessages.firstMemberId} = ${member.id} then ${directMessages.secondMemberId} else ${directMessages.firstMemberId} end`,
          ),
        )
        .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
        .where(
          and(
            activeViewer,
            ownPair,
            eq(directMessages.workspaceId, member.workspaceId),
            eq(userProfiles.isBot, false),
            ilike(userProfiles.displayName, pattern),
          ),
        )
        .orderBy(...order(userProfiles.displayName), asc(directMessages.channelId))
        .limit(SEARCH_GROUP_LIMIT),
      this.txHost.tx
        .select({
          memberId: workspaceMembers.id,
          displayName: userProfiles.displayName,
          avatarPath: userProfiles.avatarPath,
          isBot: userProfiles.isBot,
        })
        .from(workspaceMembers)
        .innerJoin(userProfiles, eq(userProfiles.id, workspaceMembers.userProfileId))
        .where(
          and(
            activeViewer,
            eq(workspaceMembers.workspaceId, member.workspaceId),
            eq(workspaceMembers.status, 'active'),
            ne(workspaceMembers.id, member.id),
            eq(userProfiles.isBot, false),
            ilike(userProfiles.displayName, pattern),
            notExists(alreadyInConversation),
          ),
        )
        .orderBy(...order(userProfiles.displayName), asc(workspaceMembers.id))
        .limit(SEARCH_GROUP_LIMIT),
    ]);
    return { channels: foundChannels, conversations, people };
  }
}
