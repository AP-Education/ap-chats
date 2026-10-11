import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';

import { DrizzleMentionsRepository } from '@/components/social/mentions/repository/drizzle-mentions.repository';
import * as schema from '@/database/drizzle/schema';
import { migrate, type TestDatabase, transactionHost } from '@/testing/pglite';

import { STAR_ME } from '../star-me.identity';
import { DrizzleStarMeRepository } from './drizzle-star-me.repository';

// Embedded PostgreSQL with the real migrations: no application database is contacted.
test('StarMe on PostgreSQL', async (t) => {
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema });
  t.after(() => pg.close());
  await migrate(pg);

  const txHost = transactionHost(db);
  const repository = new DrizzleStarMeRepository(txHost as never);
  const mentions = new DrizzleMentionsRepository(txHost as never);
  const seed = seeder(db);

  await repository.saveIdentity(STAR_ME);
  const office = await seed.workspace();
  const vlad = await seed.member(office, await seed.person('Влад'));
  const ilya = await seed.member(office, await seed.person('Ілля'));
  await repository.enrol(STAR_ME);
  const starMe = await seed.starMeIn(office);

  await t.test('joins every workspace once and stays out of one that removed it', async () => {
    const client = await seed.workspace();
    await repository.enrol(STAR_ME, client);
    await db
      .update(schema.workspaceMembers)
      .set({ status: 'removed' })
      .where(eq(schema.workspaceMembers.id, await seed.starMeIn(client)));

    await repository.saveIdentity({ ...STAR_ME, displayName: 'StarMe 2' });
    await repository.enrol(STAR_ME);

    const rows = await db
      .select({ status: schema.workspaceMembers.status, name: schema.userProfiles.displayName })
      .from(schema.workspaceMembers)
      .innerJoin(
        schema.userProfiles,
        eq(schema.userProfiles.id, schema.workspaceMembers.userProfileId),
      )
      .where(eq(schema.userProfiles.oidcUserId, STAR_ME.subject));
    assert.deepEqual(rows.map(({ status }) => status).sort(), ['active', 'removed']);
    assert.ok(rows.every(({ name }) => name === 'StarMe 2'));
    await repository.saveIdentity(STAR_ME);
  });

  await t.test('a question knows whether it mentions StarMe or replies to it', async () => {
    const general = await seed.channel(office, vlad, 'public');
    const mentioning = await seed.post(general, vlad, `:member[${starMe}] підсумуй`, [starMe]);
    const plain = await seed.post(general, vlad, 'просто повідомлення');

    const asked = await repository.question(vlad, general, mentioning.id, starMe);
    const unasked = await repository.question(vlad, general, plain.id, starMe);
    const someoneElses = await repository.question(ilya, general, mentioning.id, starMe);
    const answer = await seed.post(general, starMe, 'відповідь');
    const followUp = await seed.post(general, vlad, 'а детальніше?', [], answer.id);
    const following = await repository.question(vlad, general, followUp.id, starMe);

    assert.deepEqual([asked?.mentionsStarMe, asked?.seq], [true, mentioning.seq]);
    assert.equal(unasked?.mentionsStarMe, false);
    assert.equal(someoneElses, undefined);
    assert.equal(following?.repliesToStarMe, true);
    assert.equal(asked?.repliesToStarMe, false);
  });

  await t.test(
    'reads the latest live messages up to the question, with mentions named',
    async () => {
      const general = await seed.channel(office, vlad, 'public');
      await seed.post(general, ilya, 'перше');
      const second = await seed.post(general, ilya, `:member[${vlad}] друге`, [vlad]);
      const removed = await seed.post(general, ilya, 'видалене');
      const asked = await seed.post(general, vlad, `:member[${starMe}] що далі?`, [starMe]);
      await seed.post(general, ilya, 'після питання');
      await db
        .update(schema.chatMessages)
        .set({ deletedAt: new Date() })
        .where(eq(schema.chatMessages.id, removed.id));

      const recent = await repository.recent(general, asked.seq, 2);
      const picked = await repository.selected(general, [asked.id, second.id]);

      assert.deepEqual(
        recent.map(({ id }) => id),
        [second.id, asked.id],
      );
      assert.deepEqual(
        recent[0]?.mentions.map(({ displayName }) => displayName),
        ['Влад'],
      );
      assert.deepEqual(
        picked.map(({ id }) => id),
        [second.id, asked.id],
      );
      assert.equal(recent[1]?.author.displayName, 'Влад');
    },
  );

  await t.test(
    'a bot is summoned in any group channel, a person only where they belong',
    async () => {
      const team = await seed.channel(office, vlad, 'private');
      const direct = await seed.direct(office, vlad, ilya);

      assert.equal(await mentions.allActiveInChannel(office, team, [starMe]), true);
      assert.equal(await mentions.allActiveInChannel(office, team, [ilya]), false);
      assert.equal(await mentions.allActiveInChannel(office, direct, [starMe]), false);
      assert.deepEqual(
        (await mentions.candidates(office, team, '')).map(({ displayName }) => displayName),
        ['StarMe', 'Влад'],
      );
    },
  );

  await t.test(
    'remembers the earlier messages of its channel a question was asked about',
    async () => {
      const general = await seed.channel(office, vlad, 'public');
      const elsewhere = await seed.channel(office, vlad, 'public');
      const first = await seed.post(general, ilya, 'бюджет');
      const removed = await seed.post(general, ilya, 'чернетка');
      const foreign = await seed.post(elsewhere, ilya, 'інше');
      const asked = await seed.post(general, vlad, `:member[${starMe}] що тут?`, [starMe]);
      const later = await seed.post(general, ilya, 'після питання');
      const question = (await repository.question(vlad, general, asked.id, starMe))!;

      await repository.pick(question, [later.id, first.id, foreign.id, removed.id]);
      await repository.pick(question, [first.id]);
      await db
        .update(schema.chatMessages)
        .set({ deletedAt: new Date() })
        .where(eq(schema.chatMessages.id, removed.id));

      assert.deepEqual(
        (await repository.picked(general, asked.id)).map(({ id }) => id),
        [first.id],
      );
    },
  );

  await t.test('finds the answer StarMe sent with a nonce', async () => {
    const general = await seed.channel(office, vlad, 'public');
    const answer = await seed.post(general, starMe, 'відповідь');

    assert.equal(await repository.answerId(general, starMe, answer.nonce), answer.id);
    assert.equal(await repository.answerId(general, vlad, answer.nonce), undefined);
  });
});

function seeder(db: TestDatabase) {
  const seqs = new Map<string, bigint>();

  return {
    async person(displayName: string) {
      const [profile] = await db
        .insert(schema.userProfiles)
        .values({ oidcUserId: `${displayName}-${randomUUID()}`, displayName })
        .returning();
      return profile!.id;
    },

    async workspace() {
      const [workspace] = await db.insert(schema.workspaces).values({ name: 'Office' }).returning();
      return workspace!.id;
    },

    async member(workspaceId: string, userProfileId: string) {
      const [member] = await db
        .insert(schema.workspaceMembers)
        .values({ workspaceId, userProfileId })
        .returning();
      return member!.id;
    },

    async starMeIn(workspaceId: string) {
      const [row] = await db
        .select({ id: schema.workspaceMembers.id })
        .from(schema.workspaceMembers)
        .innerJoin(
          schema.userProfiles,
          eq(schema.userProfiles.id, schema.workspaceMembers.userProfileId),
        )
        .where(
          and(
            eq(schema.workspaceMembers.workspaceId, workspaceId),
            eq(schema.userProfiles.oidcUserId, STAR_ME.subject),
          ),
        );
      return row!.id;
    },

    async channel(workspaceId: string, creator: string, kind: 'public' | 'private') {
      const [channel] = await db
        .insert(schema.channels)
        .values({ workspaceId, kind, name: `channel-${randomUUID()}`, createdByMemberId: creator })
        .returning();
      await db
        .insert(schema.channelMemberships)
        .values({ workspaceId, channelId: channel!.id, memberId: creator });
      return channel!.id;
    },

    async direct(workspaceId: string, first: string, second: string) {
      const [channel] = await db
        .insert(schema.channels)
        .values({ workspaceId, kind: 'dm', createdByMemberId: first })
        .returning();
      const [firstMemberId, secondMemberId] = [first, second].sort();
      await db.insert(schema.directMessages).values({
        workspaceId,
        channelId: channel!.id,
        firstMemberId: firstMemberId!,
        secondMemberId: secondMemberId!,
      });
      await db.insert(schema.channelMemberships).values([
        { workspaceId, channelId: channel!.id, memberId: first },
        { workspaceId, channelId: channel!.id, memberId: second },
      ]);
      return channel!.id;
    },

    async post(
      channelId: string,
      author: string,
      markdown: string,
      mentioned: string[] = [],
      replyToMessageId: string | null = null,
    ) {
      const [channel] = await db
        .select({ workspaceId: schema.channels.workspaceId })
        .from(schema.channels)
        .where(eq(schema.channels.id, channelId));
      const workspaceId = channel!.workspaceId;
      const nonce = randomUUID();
      const seq = (seqs.get(channelId) ?? 0n) + 1n;
      seqs.set(channelId, seq);

      const [message] = await db
        .insert(schema.chatMessages)
        .values({
          workspaceId,
          channelId,
          authorMemberId: author,
          contentMarkdown: markdown,
          replyToMessageId,
          requestDigest: nonce,
          clientNonce: nonce,
        })
        .returning();
      await db
        .insert(schema.channelEntries)
        .values({ workspaceId, channelId, messageId: message!.id, seq });
      if (mentioned.length) {
        await db.insert(schema.messageMentions).values(
          mentioned.map((memberId) => ({
            workspaceId,
            channelId,
            messageId: message!.id,
            memberId,
          })),
        );
      }
      return { id: message!.id, seq, nonce };
    },
  };
}
