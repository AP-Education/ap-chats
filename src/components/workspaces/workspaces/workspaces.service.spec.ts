import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { ForbiddenException } from '@nestjs/common';
import { type TransactionalAdapter, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { eq } from 'drizzle-orm';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';

import * as schema from '@/database/drizzle/schema';
import type { EventPublisher } from '@/globals/publisher/event-publisher';

import { DrizzleWorkspaceMembersRepository } from '../members/repository';
import { WorkspaceMembersService } from '../members/workspace-members.service';
import {
  WORKSPACE_DELETED_EVENT,
  type WorkspaceDeletedEvent,
} from './events/workspace-deleted.event';
import { DrizzleWorkspacesRepository } from './repository';
import { WorkspacesService } from './workspaces.service';

// Embedded PostgreSQL with the real migrations, so the cascade is the one production runs.
test('workspace deletion on PostgreSQL', async (t) => {
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema });
  t.after(() => pg.close());
  await migrate(pg);

  const txHost = transactionHost(db);
  const members = new DrizzleWorkspaceMembersRepository(txHost as never);
  const published: { key: string; event: unknown }[] = [];
  const service = new WorkspacesService(new DrizzleWorkspacesRepository(txHost as never), members, {
    publish: (key, event) => published.push({ key, event }),
  } satisfies EventPublisher);

  // A workspace with everything that hangs off it: a category, a channel with a message,
  // its pin, mention and read state, a direct conversation and a call.
  async function seedWorkspace() {
    const workspaceId = randomUUID();
    // A direct conversation stores its pair in id order.
    const [ownerId, memberId] = [randomUUID(), randomUUID()].sort() as [string, string];
    const [ownerUserId, memberUserId] = [`owner-${workspaceId}`, `member-${workspaceId}`];
    const [ownerProfile, memberProfile] = [randomUUID(), randomUUID()];
    const [categoryId, channelId, directId, messageId, callId] = [
      randomUUID(),
      randomUUID(),
      randomUUID(),
      randomUUID(),
      randomUUID(),
    ];

    await db.insert(schema.workspaces).values({ id: workspaceId, name: 'Workspace' });
    await db.insert(schema.userProfiles).values([
      { id: ownerProfile, oidcUserId: ownerUserId },
      { id: memberProfile, oidcUserId: memberUserId },
    ]);
    await db.insert(schema.workspaceMembers).values([
      { id: ownerId, workspaceId, userProfileId: ownerProfile, role: 'owner' },
      { id: memberId, workspaceId, userProfileId: memberProfile },
    ]);
    await db
      .insert(schema.channelCategories)
      .values({ id: categoryId, workspaceId, name: 'Category' });
    await db.insert(schema.channels).values([
      {
        id: channelId,
        workspaceId,
        categoryId,
        kind: 'public',
        name: 'General',
        createdByMemberId: ownerId,
      },
      { id: directId, workspaceId, kind: 'dm', createdByMemberId: memberId },
    ]);
    await db.insert(schema.directMessages).values({
      workspaceId,
      channelId: directId,
      firstMemberId: ownerId,
      secondMemberId: memberId,
    });
    await db.insert(schema.channelMemberships).values([
      { workspaceId, channelId, memberId: ownerId, lastReadEntrySeq: 2n },
      { workspaceId, channelId, memberId: memberId },
    ]);
    await db.insert(schema.chatMessages).values({
      id: messageId,
      workspaceId,
      channelId,
      authorMemberId: memberId,
      contentMarkdown: 'hello',
      requestDigest: messageId,
      clientNonce: randomUUID(),
    });
    await db.insert(schema.messageMentions).values({
      workspaceId,
      channelId,
      messageId,
      memberId: ownerId,
    });
    await db.insert(schema.messagePins).values({
      workspaceId,
      channelId,
      messageId,
      pinnedByMemberId: ownerId,
    });
    await db.insert(schema.calls).values({
      id: callId,
      workspaceId,
      channelId,
      roomName: `room-${callId}`,
      startedByMemberId: memberId,
    });
    await db.insert(schema.channelEntries).values([
      { workspaceId, channelId, seq: 1n, messageId },
      { workspaceId, channelId, seq: 2n, callId },
    ]);

    const [owner, member] = await Promise.all([
      members.findForUser(workspaceId, ownerUserId),
      members.findForUser(workspaceId, memberUserId),
    ]);
    return { workspaceId, owner: owner!, member: member!, ownerUserId, memberUserId };
  }

  async function rowsOf(workspaceId: string) {
    const tables = [
      schema.workspaceMembers,
      schema.channelCategories,
      schema.channels,
      schema.directMessages,
      schema.channelMemberships,
      schema.chatMessages,
      schema.messageMentions,
      schema.messagePins,
      schema.calls,
      schema.channelEntries,
    ];
    const counts = await Promise.all(
      tables.map((table) => db.$count(table, eq(table.workspaceId, workspaceId))),
    );
    return counts.reduce((total, count) => total + count, 0);
  }

  await t.test('a member who is not the owner cannot delete the workspace', async () => {
    const { workspaceId, member, memberUserId } = await seedWorkspace();

    await assert.rejects(service.delete(member), ForbiddenException);

    const listed = await service.findAllForCurrentUser(memberUserId);
    assert.deepEqual(
      listed.map(({ id }) => id),
      [workspaceId],
    );
    assert.deepEqual(published, []);
  });

  await t.test('removing a single member keeps the channel content', async () => {
    const { workspaceId, owner, memberUserId } = await seedWorkspace();
    const before = await rowsOf(workspaceId);

    await new WorkspaceMembersService(members).remove(owner, memberUserId);

    assert.equal(await members.findForUser(workspaceId, memberUserId), undefined);
    assert.equal(await rowsOf(workspaceId), before, 'removal is a status change, nothing cascades');
  });

  await t.test('the owner deletes the workspace with everything in it', async () => {
    const kept = await seedWorkspace();
    const { workspaceId, owner, ownerUserId, memberUserId } = await seedWorkspace();

    await service.delete(owner);

    assert.deepEqual(await service.findAllForCurrentUser(memberUserId), []);
    assert.deepEqual(await service.findAllForCurrentUser(ownerUserId), []);
    assert.equal(await members.findForUser(workspaceId, memberUserId), undefined);
    assert.equal(await rowsOf(workspaceId), 0);
    assert.ok((await rowsOf(kept.workspaceId)) > 0, 'other workspaces are untouched');
    const [deleted] = published;
    assert.equal(published.length, 1);
    assert.equal(deleted?.key, WORKSPACE_DELETED_EVENT);
    const event = deleted?.event as WorkspaceDeletedEvent;
    assert.equal(event.workspaceId, workspaceId);
    assert.deepEqual(event.memberUserIds.toSorted(), [memberUserId, ownerUserId]);
  });
});

async function migrate(pg: PGlite) {
  const migrations = readdirSync('drizzle')
    .filter((name) => /^\d+.*\.sql$/u.test(name))
    .sort();

  for (const migration of migrations) await pg.exec(readFileSync(`drizzle/${migration}`, 'utf8'));
}

type TestDatabase = PgliteDatabase<typeof schema>;

function transactionHost(db: TestDatabase) {
  const adapter = new TransactionalAdapterDrizzleOrm<TestDatabase>({
    drizzleInstanceToken: Symbol('test-db'),
  });

  return new TransactionHost<TransactionalAdapter<TestDatabase, TestDatabase, object>>({
    ...adapter.optionsFactory(db),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: { isolationLevel: 'read committed' },
    extraProviderTokens: [],
  });
}
