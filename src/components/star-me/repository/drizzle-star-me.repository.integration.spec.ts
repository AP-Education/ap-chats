import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { DrizzleChannelAccessRepository } from '@/components/communities/channel-access/channel-access/repository/drizzle-channel-access.repository';
import { DrizzleMentionsRepository } from '@/components/social/mentions/repository/drizzle-mentions.repository';
import { DrizzleWorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import * as schema from '@/database/drizzle/schema';
import { migratedDatabase, type TestDatabase, transactionHost } from '@/testing/pglite';
import { socialServices } from '@/testing/social';

import { STAR_ME } from '../star-me.identity';
import { answerNonce, StarMeService } from '../star-me.service';
import { StarMeActivity } from '../star-me-activity';
import { DrizzleStarMeRepository } from './drizzle-star-me.repository';

// Embedded PostgreSQL with the real migrations: no application database is contacted.
test('StarMe on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

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
    const general = await seed.channel(office, vlad);
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
      const general = await seed.channel(office, vlad);
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

  await t.test('only StarMe can be summoned in a human DM without joining it', async () => {
    const team = await seed.channel(office, vlad);
    const direct = await seed.direct(office, vlad, ilya);

    assert.equal(await mentions.allActiveInChannel(office, team, [starMe]), true);
    assert.equal(await mentions.allActiveInChannel(office, team, [ilya]), false);
    assert.equal(await mentions.allActiveInChannel(office, direct, [starMe]), true);
    assert.deepEqual(
      (await mentions.candidates(office, team, '')).map(({ displayName }) => displayName),
      ['StarMe', 'Влад'],
    );
    const candidates = await mentions.candidates(office, direct, '');
    assert.deepEqual(
      new Set(candidates.map(({ memberId }) => memberId)),
      new Set([vlad, ilya, starMe]),
    );
    const impostorProfile = await seed.person('StarMe');
    await db
      .update(schema.userProfiles)
      .set({ isBot: true })
      .where(eq(schema.userProfiles.id, impostorProfile));
    const impostor = await seed.member(office, impostorProfile);
    assert.equal(await mentions.allActiveInChannel(office, direct, [impostor]), false);
    assert.equal(
      (await mentions.candidates(office, direct, 'StarMe')).some(
        ({ memberId }) => memberId === impostor,
      ),
      false,
    );
    const memberships = await db
      .select({ memberId: schema.channelMemberships.memberId })
      .from(schema.channelMemberships)
      .where(eq(schema.channelMemberships.channelId, direct));
    assert.deepEqual(new Set(memberships.map(({ memberId }) => memberId)), new Set([vlad, ilya]));
    await db
      .update(schema.workspaceMembers)
      .set({ status: 'removed' })
      .where(eq(schema.workspaceMembers.id, starMe));
    assert.equal(await mentions.allActiveInChannel(office, direct, [starMe]), false);
    assert.deepEqual(await mentions.candidates(office, direct, 'StarMe'), []);
    await db
      .update(schema.workspaceMembers)
      .set({ status: 'active' })
      .where(eq(schema.workspaceMembers.id, starMe));
  });

  await t.test('reads the live messages a question is about, oldest first', async () => {
    const general = await seed.channel(office, vlad);
    const first = await seed.post(general, ilya, 'бюджет');
    const second = await seed.post(general, ilya, 'терміни');
    const removed = await seed.post(general, ilya, 'чернетка');
    const asked = await seed.post(general, vlad, `:member[${starMe}] що тут?`, [starMe]);
    await db.insert(schema.messageContext).values(
      [second, removed, first].map(({ id }) => ({
        workspaceId: office,
        channelId: general,
        messageId: asked.id,
        contextMessageId: id,
      })),
    );
    await db
      .update(schema.chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(schema.chatMessages.id, removed.id));

    assert.deepEqual(
      (await repository.context(general, asked.id)).map(({ id }) => id),
      [first.id, second.id],
    );
  });

  await t.test('finds the answer StarMe sent with a nonce', async () => {
    const general = await seed.channel(office, vlad);
    const answer = await seed.post(general, starMe, 'відповідь');

    assert.equal(await repository.answerId(general, starMe, answer.nonce), answer.id);
    assert.equal(await repository.answerId(general, vlad, answer.nonce), undefined);
  });

  await t.test('each person has a private StarMe exchange inside their human DM', async () => {
    const vlad = await seed.member(office, await seed.person('Влад у DM'));
    const ilya = await seed.member(office, await seed.person('Ілля у DM'));
    const channelId = await seed.direct(office, vlad, ilya);
    const otherChannel = await seed.direct(
      office,
      vlad,
      await seed.member(office, await seed.person('Інша людина')),
    );
    const people = new DrizzleWorkspaceMembersRepository(txHost as never);
    const asker = (await people.findById(office, vlad))!;
    const peer = (await people.findById(office, ilya))!;
    const bot = (await people.findById(office, starMe))!;
    const outsider = (await people.findById(
      office,
      await seed.member(office, await seed.person('Сторонній')),
    ))!;
    const access = new ChannelAccessPolicy(new DrizzleChannelAccessRepository(txHost as never));
    const social = socialServices(txHost);
    const activity = new StarMeActivity();
    const calls: { token: string; texts: string[] }[] = [];
    let response: Promise<string> = Promise.resolve('Відповідь StarMe');
    const service = new StarMeService(
      people,
      access,
      social.sending,
      repository,
      {
        reply: async (turns, token) => {
          calls.push({ token, texts: turns.map(({ text }) => text) });
          return response;
        },
      },
      activity,
      social.events,
      { error() {} } as never,
    );
    const post = (person: typeof asker, markdown: string, extra = {}) =>
      social.sending.send(person, channelId, { markdown, clientNonce: randomUUID(), ...extra });
    const settle = async (id: string) => {
      const deadline = Date.now() + 5000;
      while (activity.isThinking(id)) {
        if (Date.now() > deadline) throw new Error('Answer did not finish');
        await new Promise((done) => setTimeout(done, 10));
      }
    };
    const plain = await post(asker, 'Привіт, Ілля');
    await assert.rejects(
      service.answer(asker, channelId, { questionId: plain.id }, 'owner-token'),
      BadRequestException,
    );
    assert.equal(calls.length, 0);
    const peersMessage = await post(peer, 'Терміни до п’ятниці');
    await social.sending.send(asker, otherChannel, {
      markdown: 'Секрет іншого DM',
      clientNonce: randomUUID(),
    });
    const question = await post(asker, `:member[${starMe}] підсумуй`, {
      contextMessageIds: [plain.id, peersMessage.id],
    });
    await assert.rejects(
      service.answer(outsider, channelId, { questionId: question.id }, 'outsider-token'),
      NotFoundException,
    );
    await assert.rejects(
      service.answer(peer, channelId, { questionId: question.id }, 'peer-token'),
      NotFoundException,
    );
    await assert.rejects(service.status(outsider, channelId), NotFoundException);
    await assert.rejects(access.requireViewAccess(bot, channelId), NotFoundException);
    await Promise.all([
      service.answer(asker, channelId, { questionId: question.id }, 'owner-token'),
      service.answer(asker, channelId, { questionId: question.id }, 'owner-token'),
    ]);
    await settle(question.id);
    await service.answer(asker, channelId, { questionId: question.id }, 'owner-token');
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.token, 'owner-token');
    assert.deepEqual(calls[0]?.texts.slice(0, 2), ['Привіт, Ілля', 'Терміни до п’ятниці']);
    assert.ok(
      calls.every(({ texts }) => texts.every((text) => !text.includes('Секрет іншого DM'))),
    );
    const answerId = (await repository.answerId(channelId, starMe, answerNonce(question.id)))!;
    assert.ok(answerId);
    await assert.rejects(social.history.entry(peer, channelId, answerId), NotFoundException);
    assert.equal((await social.history.entry(asker, channelId, answerId)).type, 'MESSAGE');
    assert.deepEqual((await service.status(peer, channelId)).questions, []);
    const foreignContext = await post(asker, `:member[${starMe}] інший контекст`, {
      contextMessageIds: [(await repository.recent(otherChannel, 100n, 1))[0]!.id],
    });
    assert.deepEqual(await repository.context(channelId, foreignContext.id), []);
    const followUp = await post(peer, 'А детальніше?', { assistant: true });
    await service.answer(peer, channelId, { questionId: followUp.id }, 'peer-token');
    await settle(followUp.id);
    assert.equal(calls.at(-1)?.token, 'peer-token');
    assert.ok(await repository.answerId(channelId, starMe, answerNonce(followUp.id)));
    const memberships = await db
      .select({ memberId: schema.channelMemberships.memberId })
      .from(schema.channelMemberships)
      .where(eq(schema.channelMemberships.channelId, channelId));
    assert.deepEqual(new Set(memberships.map(({ memberId }) => memberId)), new Set([vlad, ilya]));

    let resolve!: (value: string) => void;
    response = new Promise<string>((done) => {
      resolve = done;
    });
    const late = await post(asker, `:member[${starMe}] пізніше`);
    await service.answer(asker, channelId, { questionId: late.id }, 'owner-token');
    await db
      .update(schema.workspaceMembers)
      .set({ status: 'removed' })
      .where(eq(schema.workspaceMembers.id, ilya));
    resolve('Не публікувати після відключення співрозмовника');
    await settle(late.id);
    assert.equal(await repository.answerId(channelId, starMe, answerNonce(late.id)), undefined);
    assert.equal(activity.inChannel(channelId).at(-1)?.state, 'failed');
    await assert.rejects(post(asker, `:member[${starMe}] недоступно`), ForbiddenException);
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

    async channel(workspaceId: string, creator: string) {
      const [channel] = await db
        .insert(schema.channels)
        .values({
          workspaceId,
          kind: 'channel',
          name: `channel-${randomUUID()}`,
          createdByMemberId: creator,
        })
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
