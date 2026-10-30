import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { eq } from 'drizzle-orm';

import * as schema from '@/database/drizzle/schema';
import { channelAccessOnPostgres } from '@/testing/channel-access';
import { seedConversations } from '@/testing/conversations';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { ConversationSearchQuery } from './conversation-search.dto';
import { ConversationSearchService } from './conversation-search.service';
import { DrizzleConversationSearchRepository } from './drizzle-conversation-search.repository';

test('search validates and bounds the query before reading the directory', async () => {
  let called = false;
  const search = new ConversationSearchService({
    find: async () => {
      called = true;
      return { channels: [], conversations: [], people: [] };
    },
  });
  assert.deepEqual(await search.search({} as never, '  '), {
    channels: [],
    conversations: [],
    people: [],
  });
  assert.equal(called, false);
  assert.throws(() => search.search({} as never, 'x'.repeat(81)), BadRequestException);
  for (const q of [1, ['name'], 'x'.repeat(81)]) {
    assert.ok(validateSync(plainToInstance(ConversationSearchQuery, { q })).length > 0);
  }
  const input = plainToInstance(ConversationSearchQuery, { q: '  Олена  ' });
  assert.equal(input.q, 'Олена');
  assert.deepEqual(validateSync(input), []);
});

test('workspace conversation search on PostgreSQL', async (t) => {
  const { db, pg } = await migratedDatabase();
  t.after(() => pg.close());
  const seed = seedConversations(db);
  const access = channelAccessOnPostgres(db);
  const search = new ConversationSearchService(
    new DrizzleConversationSearchRepository(transactionHost(db) as never),
  );

  async function office() {
    const workspaceId = await seed.workspace();
    const owner = await seed.join(workspaceId, await seed.person('Owner'), 'owner');
    const viewer = await seed.join(workspaceId, await seed.person('Viewer'));
    return { workspaceId, owner, viewer };
  }

  await t.test(
    'only current readable channels match, including for a workspace manager',
    async () => {
      const { workspaceId, owner, viewer } = await office();
      await access.directory.create(owner, {
        name: 'Design open',
        permissions: { view: [{ kind: 'everyone' }], post: [], manage: [] },
      });
      await access.directory.create(owner, {
        name: 'Design private',
        permissions: { view: [], post: [], manage: [] },
      });
      const elsewhere = await office();
      await access.directory.create(elsewhere.owner, {
        name: 'Design elsewhere',
        permissions: { view: [{ kind: 'everyone' }], post: [], manage: [] },
      });
      assert.deepEqual(
        (await search.search(viewer, 'design')).channels.map((channel) => channel.name),
        ['Design open'],
      );
      await db
        .update(schema.workspaceMembers)
        .set({ accessLevel: 'manager' })
        .where(eq(schema.workspaceMembers.id, viewer.id));
      assert.deepEqual(
        (await search.search({ ...viewer, accessLevel: 'manager' }, 'Design')).channels.map(
          (channel) => channel.name,
        ),
        ['Design open'],
      );
      assert.deepEqual(
        (await search.search({ ...viewer, workspaceId: elsewhere.workspaceId }, 'Design')).channels,
        [],
      );
      assert.notEqual(workspaceId, elsewhere.workspaceId);
    },
  );

  await t.test(
    'role changes and permission revocation affect the next search immediately',
    async () => {
      const { owner, viewer } = await office();
      const role = await access.roles.create(owner, { name: 'Designers' });
      const channel = await access.directory.create(owner, {
        name: 'Design role',
        permissions: { view: [{ kind: 'role', roleId: role.id }], post: [], manage: [] },
      });
      assert.deepEqual((await search.search(viewer, 'Design')).channels, []);
      await access.roleMembers.add(owner, role.id, [viewer.id]);
      assert.deepEqual(
        (await search.search(viewer, 'Design')).channels.map((item) => item.id),
        [channel.id],
      );
      await access.roleMembers.remove(owner, role.id, viewer.id);
      assert.deepEqual((await search.search(viewer, 'Design')).channels, []);
    },
  );

  await t.test('people are active coworkers, without self, bots, or other workspaces', async () => {
    const { workspaceId, viewer } = await office();
    const person = await seed.join(workspaceId, await seed.person('Олена Коваль'));
    const removed = await seed.join(workspaceId, await seed.person('Олена removed'));
    await db
      .update(schema.workspaceMembers)
      .set({ status: 'removed' })
      .where(eq(schema.workspaceMembers.id, removed.id));
    await seed.join(workspaceId, await seed.person('Олена bot', { isBot: true }));
    await seed.join(await seed.workspace(), await seed.person('Олена foreign'));
    assert.deepEqual(
      (await search.search(viewer, 'олена')).people.map((item) => item.memberId),
      [person.id],
    );
    assert.deepEqual((await search.search(viewer, 'Viewer')).people, []);
  });

  await t.test(
    'own DMs are found beyond inbox pagination, and the person appears only once',
    async () => {
      const { workspaceId, viewer } = await office();
      const person = await seed.join(workspaceId, await seed.person('Олена'));
      const own = await seed.conversation(viewer, person);
      const other = await seed.join(workspaceId, await seed.person('Other'));
      const stranger = await seed.conversation(other, person);
      const found = await search.search(viewer, 'Олена');
      assert.deepEqual(
        found.conversations.map((item) => item.id),
        [own.channelId],
      );
      assert.deepEqual(found.people, []);
      assert.ok(!found.conversations.some((item) => item.id === stranger.channelId));
    },
  );

  await t.test(
    'an old DM remains readable after its peer leaves, without offering a new conversation',
    async () => {
      const { workspaceId, viewer } = await office();
      const person = await seed.join(workspaceId, await seed.person('Former colleague'));
      const own = await seed.conversation(viewer, person);
      await db
        .update(schema.workspaceMembers)
        .set({ status: 'removed' })
        .where(eq(schema.workspaceMembers.id, person.id));
      const found = await search.search(viewer, 'Former');
      assert.deepEqual(
        found.conversations.map((item) => [item.id, item.participant.active]),
        [[own.channelId, false]],
      );
      assert.deepEqual(found.people, []);
    },
  );

  await t.test(
    'an owned DM in another workspace stays outside the current search scope',
    async () => {
      const { viewer } = await office();
      const elsewhere = await seed.workspace();
      const samePerson = await seed.join(elsewhere, {
        ...viewer.profile,
        displayName: viewer.profile.displayName!,
      });
      const peer = await seed.join(elsewhere, await seed.person('Needle elsewhere'));
      await seed.conversation(samePerson, peer);
      assert.deepEqual(await search.search(viewer, 'Needle'), {
        channels: [],
        conversations: [],
        people: [],
      });
    },
  );

  await t.test(
    'channels and existing DMs are independently bounded before returning results',
    async () => {
      const { workspaceId, owner, viewer } = await office();
      const names = Array.from(
        { length: 25 },
        (_, index) => `Bound peer ${String(index).padStart(2, '0')}`,
      );
      for (let index = 0; index < names.length; index++) {
        await access.directory.create(owner, {
          name: `Bound channel ${String(index).padStart(2, '0')}`,
          permissions: { view: [{ kind: 'everyone' }], post: [], manage: [] },
        });
        const peer = await seed.join(workspaceId, await seed.person(names[index]!));
        await seed.conversation(viewer, peer);
      }
      const result = await search.search(viewer, 'Bound');
      assert.equal(result.channels.length, 20);
      assert.equal(result.conversations.length, 20);
      assert.deepEqual(
        result.conversations.map((item) => item.participant.displayName),
        names.slice(0, 20),
      );
      assert.deepEqual(result.people, []);
    },
  );

  await t.test('removed viewers cannot search even with a previously resolved member', async () => {
    const { owner, viewer } = await office();
    await seed.conversation(viewer, owner);
    await access.directory.create(owner, {
      name: 'Owner channel',
      permissions: { view: [{ kind: 'everyone' }], post: [], manage: [] },
    });
    await access.people.remove(owner, viewer.profile.oidcUserId);
    assert.deepEqual(await search.search(viewer, 'Owner'), {
      channels: [],
      conversations: [],
      people: [],
    });
  });

  await t.test(
    'SQL wildcards and backslashes are literal, Unicode and surrounding spaces work',
    async () => {
      const { workspaceId, viewer } = await office();
      await seed.join(workspaceId, await seed.person('50%_\\ команда 🚀'));
      await seed.join(workspaceId, await seed.person('Ordinary coworker'));
      for (const query of ['%', '_', '\\', ' 🚀 ']) {
        assert.deepEqual(
          (await search.search(viewer, query)).people.map((item) => item.displayName),
          ['50%_\\ команда 🚀'],
        );
      }
      assert.deepEqual((await search.search(viewer, "' OR 1=1 --")).people, []);
    },
  );

  await t.test('exact and prefix matches lead, and group limits have stable ordering', async () => {
    const { workspaceId, owner, viewer } = await office();
    for (const name of ['xAlpha', 'Alpha team', 'Alpha']) {
      await access.directory.create(owner, {
        name,
        permissions: { view: [{ kind: 'everyone' }], post: [], manage: [] },
      });
    }
    assert.deepEqual(
      (await search.search(viewer, 'Alpha')).channels.map((item) => item.name),
      ['Alpha', 'Alpha team', 'xAlpha'],
    );
    const names = Array.from(
      { length: 25 },
      (_, index) => `Person ${String(index).padStart(2, '0')}`,
    );
    for (const name of names) await seed.join(workspaceId, await seed.person(name));
    const first = await search.search(viewer, 'Person');
    assert.equal(first.people.length, 20);
    assert.deepEqual(
      first.people.map((item) => item.displayName),
      names.slice(0, 20),
    );
    assert.deepEqual(await search.search(viewer, 'Person'), first);
  });
});
