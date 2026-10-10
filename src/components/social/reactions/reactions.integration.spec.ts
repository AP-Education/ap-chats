import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { type TransactionalAdapter, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { eq } from 'drizzle-orm';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';

import type { WorkspaceMember } from '@/components/workspaces/members/types';
import * as schema from '@/database/drizzle/schema';

import { DrizzleHistoryRepository } from '../history/repository/drizzle-history.repository';
import { REACTION_ADDED_EVENT, ReactionAddedEvent } from './events/reaction-added.event';
import { REACTION_REMOVED_EVENT, ReactionRemovedEvent } from './events/reaction-removed.event';
import { isReactionEmoji, MAX_DISTINCT_REACTIONS } from './reaction-emoji';
import { ReactionsFacade } from './reactions.facade';
import { DrizzleReactionsRepository } from './repository/drizzle-reactions.repository';

test('a reaction is one fully qualified emoji', () => {
  for (const emoji of ['👍', '❤️', '👍🏽', '🏳️‍🌈', '#️⃣']) assert.equal(isReactionEmoji(emoji), true);
  for (const value of ['', '❤', 'ok', '👍👍', '👍 ', ':thumbsup:'])
    assert.equal(isReactionEmoji(value), false);
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
  const repository = new DrizzleReactionsRepository(txHost as never);
  const history = new DrizzleHistoryRepository(txHost as never);
  const access = { requirePostAccess: async () => {}, requireViewAccess: async () => {} };

  async function seedMessage(extraPeople = 0) {
    const workspaceId = randomUUID();
    const channelId = randomUUID();
    const messageId = randomUUID();
    const members = Array.from({ length: 2 + extraPeople }, () => randomUUID());
    const profiles = members.map(() => randomUUID());

    await db.insert(schema.workspaces).values({ id: workspaceId, name: 'Workspace' });
    await db.insert(schema.userProfiles).values(
      profiles.map((id, index) => ({
        id,
        oidcUserId: `user-${id}`,
        displayName: `Person ${index + 1}`,
      })),
    );
    await db
      .insert(schema.workspaceMembers)
      .values(members.map((id, index) => ({ id, workspaceId, userProfileId: profiles[index]! })));
    await db.insert(schema.channels).values({
      id: channelId,
      workspaceId,
      kind: 'public',
      name: 'General',
      createdByMemberId: members[0]!,
      lastEntrySeq: 1n,
    });
    await db.insert(schema.chatMessages).values({
      id: messageId,
      workspaceId,
      channelId,
      authorMemberId: members[0]!,
      contentMarkdown: 'Release is out',
      requestDigest: messageId,
      clientNonce: randomUUID(),
    });
    await db.insert(schema.channelEntries).values({ workspaceId, channelId, messageId, seq: 1n });

    const [author, reader, ...extraMembers] = members.map(
      (id) => ({ id, workspaceId }) as WorkspaceMember,
    );
    const published: { key: string; event: unknown }[] = [];
    const facade = new ReactionsFacade(access as never, repository, {
      publish: (key: string, event: unknown) => published.push({ key, event }),
    });
    const projection = async (viewer: WorkspaceMember) => {
      const { rows } = await history.page(channelId, 'after', 0n, 1n, 1, viewer.id);
      return rows[0]?.type === 'MESSAGE' ? rows[0].reactions : undefined;
    };

    return {
      channelId,
      messageId,
      author: author!,
      reader: reader!,
      extraMembers,
      facade,
      published,
      projection,
    };
  }

  await t.test('history shows each emoji once, in the order it first appeared', async () => {
    const { channelId, messageId, author, reader, facade, projection } = await seedMessage();

    await facade.add(reader, channelId, messageId, '🎉');
    await facade.add(author, channelId, messageId, '👍');
    await facade.add(reader, channelId, messageId, '👍');

    assert.deepEqual(await projection(author), [
      { emoji: '🎉', count: 1, reacted: false, recentMemberIds: [reader.id] },
      { emoji: '👍', count: 2, reacted: true, recentMemberIds: [reader.id, author.id] },
    ]);
    assert.deepEqual(
      (await projection(reader))?.map((reaction) => reaction.reacted),
      [true, true],
    );
    const people = async (emoji?: string) =>
      (await facade.reactors(author, channelId, messageId, emoji)).map(
        (person) => `${person.displayName} ${person.emoji}`,
      );
    assert.deepEqual(await people('👍'), ['Person 2 👍', 'Person 1 👍']);
    assert.deepEqual(await people(), ['Person 2 👍', 'Person 1 👍', 'Person 2 🎉']);
  });

  await t.test('a chip names at most its three latest people', async () => {
    const { channelId, messageId, author, facade, extraMembers } = await seedMessage(3);

    for (const person of [author, ...extraMembers])
      await facade.add(person, channelId, messageId, '👍');

    const state = await facade.add(author, channelId, messageId, '👍');
    assert.equal(state.count, 4);
    assert.deepEqual(state.recentMemberIds, extraMembers.map((person) => person.id).reverse());
  });

  await t.test('a repeated add or remove changes nothing and announces nothing', async () => {
    const { channelId, messageId, author, reader, facade, published, projection } =
      await seedMessage();

    await facade.add(author, channelId, messageId, '👍');
    assert.deepEqual(await facade.add(reader, channelId, messageId, '👍'), {
      emoji: '👍',
      count: 2,
      recentMemberIds: [reader.id, author.id],
      reacted: true,
    });
    await facade.add(reader, channelId, messageId, '👍');
    await facade.remove(reader, channelId, messageId, '👍');
    await facade.remove(reader, channelId, messageId, '👍');

    const event = (Event: typeof ReactionAddedEvent, actor: WorkspaceMember, faces: string[]) =>
      new Event(actor.workspaceId, channelId, messageId, actor.id, '👍', faces.length, faces);
    assert.deepEqual(published, [
      { key: REACTION_ADDED_EVENT, event: event(ReactionAddedEvent, author, [author.id]) },
      {
        key: REACTION_ADDED_EVENT,
        event: event(ReactionAddedEvent, reader, [reader.id, author.id]),
      },
      { key: REACTION_REMOVED_EVENT, event: event(ReactionRemovedEvent, reader, [author.id]) },
    ]);
    assert.deepEqual(await projection(reader), [
      { emoji: '👍', count: 1, reacted: false, recentMemberIds: [author.id] },
    ]);
  });

  await t.test('a full message takes no new emoji but keeps taking the ones it has', async () => {
    const { channelId, messageId, author, reader, facade } = await seedMessage();
    const emojis = [...'😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙🥲😚🙂'];
    assert.equal(emojis.length, MAX_DISTINCT_REACTIONS);
    for (const emoji of emojis) await facade.add(author, channelId, messageId, emoji);

    await assert.rejects(facade.add(reader, channelId, messageId, '👍'), ConflictException);
    assert.equal((await facade.add(reader, channelId, messageId, '😀')).count, 2);
  });

  await t.test('text and deleted messages take no reactions', async () => {
    const { channelId, messageId, author, facade, published } = await seedMessage();

    await assert.rejects(facade.add(author, channelId, messageId, 'ok'), BadRequestException);
    await db
      .update(schema.chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(schema.chatMessages.id, messageId));
    await assert.rejects(facade.add(author, channelId, messageId, '👍'), NotFoundException);
    assert.deepEqual(published, []);
  });

  await t.test('reactions go with their channel', async () => {
    const { channelId, messageId, author, facade } = await seedMessage();
    await facade.add(author, channelId, messageId, '👍');

    await db.delete(schema.channels).where(eq(schema.channels.id, channelId));

    const left = await db
      .select()
      .from(schema.messageReactions)
      .where(eq(schema.messageReactions.messageId, messageId));
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
