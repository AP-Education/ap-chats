import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import type { CallStatus } from '@/components/calls/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import * as schema from '@/database/drizzle/schema';

import type { TestDatabase } from './pglite';

interface Person {
  id: string;
  oidcUserId: string;
  displayName: string;
}

interface Conversation {
  workspaceId: string;
  channelId: string;
  seq: bigint;
}

/** People, workspaces and direct conversations for integration specs, on a steady clock. */
export function seedConversations(db: TestDatabase) {
  let clock = Date.parse('2026-01-01T00:00:00Z');
  const tick = () => new Date((clock += 1000));

  return {
    async person(displayName: string): Promise<Person> {
      const person = {
        id: randomUUID(),
        oidcUserId: `${displayName}-${randomUUID()}`,
        displayName,
      };
      await db.insert(schema.userProfiles).values(person);
      return person;
    },

    async workspace() {
      const id = randomUUID();
      await db.insert(schema.workspaces).values({ id, name: 'Workspace' });
      return id;
    },

    async join(workspaceId: string, person: Person): Promise<WorkspaceMember> {
      const [member] = await db
        .insert(schema.workspaceMembers)
        .values({ workspaceId, userProfileId: person.id })
        .returning();
      return {
        ...member!,
        profile: {
          id: person.id,
          oidcUserId: person.oidcUserId,
          displayName: person.displayName,
          avatarPath: null,
        },
      };
    },

    async conversation(first: WorkspaceMember, second: WorkspaceMember): Promise<Conversation> {
      const { workspaceId } = first;
      const channelId = randomUUID();
      const [firstMemberId, secondMemberId] = [first.id, second.id].sort();
      await db.insert(schema.channels).values({
        id: channelId,
        workspaceId,
        kind: 'dm',
        createdByMemberId: first.id,
        updatedAt: tick(),
      });
      await db.insert(schema.directMessages).values({
        workspaceId,
        channelId,
        firstMemberId: firstMemberId!,
        secondMemberId: secondMemberId!,
      });
      await db.insert(schema.channelMemberships).values([
        { workspaceId, channelId, memberId: first.id },
        { workspaceId, channelId, memberId: second.id },
      ]);
      return { workspaceId, channelId, seq: 0n };
    },

    async post(conversation: Conversation, author: WorkspaceMember) {
      const { workspaceId, channelId } = conversation;
      const messageId = randomUUID();
      conversation.seq += 1n;

      await db.insert(schema.chatMessages).values({
        id: messageId,
        workspaceId,
        channelId,
        authorMemberId: author.id,
        contentMarkdown: 'Hello',
        requestDigest: messageId,
        clientNonce: randomUUID(),
      });
      await db
        .insert(schema.channelEntries)
        .values({ workspaceId, channelId, messageId, seq: conversation.seq });
      await db
        .update(schema.channels)
        .set({ lastEntrySeq: conversation.seq, updatedAt: tick() })
        .where(eq(schema.channels.id, channelId));
    },

    async call(conversation: Conversation, caller: WorkspaceMember, status: CallStatus) {
      const id = randomUUID();
      await db.insert(schema.calls).values({
        id,
        workspaceId: conversation.workspaceId,
        channelId: conversation.channelId,
        roomName: `room-${id}`,
        status,
        startedByMemberId: caller.id,
        startedAt: tick(),
      });
      return id;
    },
  };
}
