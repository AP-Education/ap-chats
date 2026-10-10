import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { type TransactionalAdapter, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { eq } from 'drizzle-orm';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';

import type { WorkspaceMember } from '@/components/workspaces/members/types';
import * as schema from '@/database/drizzle/schema';

import { DrizzleHistoryRepository } from '../history/repository/drizzle-history.repository';
import { ReactionDto } from './dto/reaction.dto';
import { REACTION_CHANGED_EVENT, ReactionChangedEvent } from './events/reaction-changed.event';
import { ReactionsFacade } from './reactions.facade';
import { DrizzleReactionsRepository } from './repository/drizzle-reactions.repository';

test('a reaction is one fully qualified emoji', () => {
  const accepts = (emoji: string) =>
    validateSync(plainToInstance(ReactionDto, { emoji })).length === 0;

  for (const emoji of ['👍', '❤️', '👍🏽', '🏳️‍🌈', '#️⃣']) assert.equal(accepts(emoji), true, emoji);
  for (const value of ['', '❤', 'ok', '👍👍', '👍 ', ':thumbsup:'])
    assert.equal(accepts(value), false, value);
});

// Embedded PostgreSQL with the real migrations: no application database is contacted.
test('reactions on PostgreSQL', async (t) => {
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema });
  t.after(() => pg.close());
  for (const migration of readdirSync('drizzle')
    .filter((name) => name.endsWith('.sql'))
    .sort())
    await pg.exec(readFileSync(`drizzle/${migration}`, 'utf8'));

  const txHost = transactionHost(db);
  const history = new DrizzleHistoryRepository(txHost as never);
  const access = { requirePostAccess: async () => {}, requireViewAccess: async () => {} };

  /** A channel with one message and the given number of people in its workspace. */
  async function conversation(people = 2) {
    const workspaceId = randomUUID();
    const channelId = randomUUID();
    const messageId = randomUUID();
    const members = Array.from({ length: people }, (_, index) => ({
      id: randomUUID(),
      profileId: randomUUID(),
      name: `Person ${index + 1}`,
    }));

    await db.insert(schema.workspaces).values({ id: workspaceId, name: 'Workspace' });
    await db.insert(schema.userProfiles).values(
      members.map(({ profileId, name }) => ({
        id: profileId,
        oidcUserId: `user-${profileId}`,
        displayName: name,
      })),
    );
    await db
      .insert(schema.workspaceMembers)
      .values(members.map(({ id, profileId }) => ({ id, workspaceId, userProfileId: profileId })));
    await db.insert(schema.channels).values({
      id: channelId,
      workspaceId,
      kind: 'public',
      name: 'General',
      createdByMemberId: members[0]!.id,
      lastEntrySeq: 1n,
    });
    await db.insert(schema.chatMessages).values({
      id: messageId,
      workspaceId,
      channelId,
      authorMemberId: members[0]!.id,
      contentMarkdown: 'Release is out',
      requestDigest: messageId,
      clientNonce: randomUUID(),
    });
    await db.insert(schema.channelEntries).values({ workspaceId, channelId, messageId, seq: 1n });

    const published: { key: string; event: unknown }[] = [];
    const reactions = new ReactionsFacade(
      access as never,
      new DrizzleReactionsRepository(txHost as never),
      { publish: (key: string, event: unknown) => published.push({ key, event }) },
    );
    const person = (index: number) => ({ id: members[index]!.id, workspaceId }) as WorkspaceMember;
    const react = (who: number, emoji: string) =>
      reactions.react(person(who), channelId, messageId, emoji);
    const withdraw = (who: number, emoji: string) =>
      reactions.withdraw(person(who), channelId, messageId, emoji);
    const whoReacted = async (emoji?: string) => {
      const people = await reactions.whoReacted(person(0), channelId, messageId, emoji);
      return people.map((reactor) => `${reactor.displayName} ${reactor.emoji}`);
    };
    const seenBy = async (who: number) => {
      const viewerMemberId = person(who).id;
      const query = { channelId, viewerMemberId, direction: 'after' as const, ceiling: 1n };
      const { rows } = await history.page({ ...query, limit: 1 });
      return rows[0]?.type === 'MESSAGE' ? rows[0].reactions : undefined;
    };

    return { channelId, messageId, person, react, withdraw, whoReacted, seenBy, published };
  }

  await t.test('history shows each emoji once, in the order it first appeared', async () => {
    const chat = await conversation();
    const [author, reader] = [chat.person(0).id, chat.person(1).id];

    await chat.react(1, '🎉');
    await chat.react(0, '👍');
    await chat.react(1, '👍');

    assert.deepEqual(await chat.seenBy(0), [
      { emoji: '🎉', count: 1, recentMemberIds: [reader], reacted: false },
      { emoji: '👍', count: 2, recentMemberIds: [reader, author], reacted: true },
    ]);
    assert.deepEqual(
      (await chat.seenBy(1))?.map((reaction) => reaction.reacted),
      [true, true],
    );
  });

  await t.test('a history page still brings each message its mentions', async () => {
    const chat = await conversation();
    const { workspaceId, id: memberId } = chat.person(1);
    await db.insert(schema.messageMentions).values({
      workspaceId,
      channelId: chat.channelId,
      messageId: chat.messageId,
      memberId,
    });

    const { rows } = await history.page({
      channelId: chat.channelId,
      viewerMemberId: chat.person(0).id,
      direction: 'after',
      ceiling: 1n,
      limit: 1,
    });

    const [row] = rows;
    assert.deepEqual(row?.type === 'MESSAGE' && row.mentions, [
      { memberId, displayName: 'Person 2', avatarPath: null },
    ]);
  });

  await t.test('people who reacted come latest first, by emoji or all together', async () => {
    const chat = await conversation();

    await chat.react(1, '🎉');
    await chat.react(0, '👍');
    await chat.react(1, '👍');

    assert.deepEqual(await chat.whoReacted('👍'), ['Person 2 👍', 'Person 1 👍']);
    assert.deepEqual(await chat.whoReacted(), ['Person 2 👍', 'Person 1 👍', 'Person 2 🎉']);
  });

  await t.test('a chip names at most its three latest people', async () => {
    const chat = await conversation(4);
    for (const who of [0, 1, 2, 3]) await chat.react(who, '👍');

    const summary = await chat.react(0, '👍');

    assert.equal(summary.count, 4);
    assert.deepEqual(
      summary.recentMemberIds,
      [3, 2, 1].map((who) => chat.person(who).id),
    );
  });

  await t.test('only a real change is announced, with the state it left', async () => {
    const chat = await conversation();
    const [author, reader] = [chat.person(0), chat.person(1)];

    await chat.react(0, '👍');
    await chat.react(1, '👍');
    await chat.react(1, '👍');
    await chat.withdraw(1, '👍');
    await chat.withdraw(1, '👍');

    const change = (actor: WorkspaceMember, added: boolean, people: WorkspaceMember[]) => {
      const reaction = {
        emoji: '👍',
        count: people.length,
        recentMemberIds: people.map((person) => person.id),
      };
      const { workspaceId, id } = actor;
      const event = new ReactionChangedEvent(
        workspaceId,
        chat.channelId,
        chat.messageId,
        id,
        added,
        reaction,
      );
      return { key: REACTION_CHANGED_EVENT, event };
    };
    assert.deepEqual(chat.published, [
      change(author, true, [author]),
      change(reader, true, [reader, author]),
      change(reader, false, [author]),
    ]);
  });

  await t.test('a full message takes no new emoji but keeps taking the ones it has', async () => {
    const chat = await conversation();
    const twenty = [...'😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙🥲😚🙂'];
    for (const emoji of twenty) await chat.react(0, emoji);

    await assert.rejects(chat.react(1, '👍'), ConflictException);
    assert.equal((await chat.react(1, '😀')).count, 2);
  });

  await t.test('a deleted message takes no reactions', async () => {
    const chat = await conversation();
    await db
      .update(schema.chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(schema.chatMessages.id, chat.messageId));

    await assert.rejects(chat.react(0, '👍'), NotFoundException);
    assert.deepEqual(chat.published, []);
  });

  await t.test('reactions go with their channel', async () => {
    const chat = await conversation();
    await chat.react(0, '👍');

    await db.delete(schema.channels).where(eq(schema.channels.id, chat.channelId));

    const left = await db
      .select()
      .from(schema.messageReactions)
      .where(eq(schema.messageReactions.messageId, chat.messageId));
    assert.deepEqual(left, []);
  });
});

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
