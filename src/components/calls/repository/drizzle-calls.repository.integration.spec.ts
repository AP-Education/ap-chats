import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '@/database/drizzle/schema';
import { seedConversations } from '@/testing/conversations';
import { migrate, transactionHost } from '@/testing/pglite';

import { DrizzleCallsRepository } from './drizzle-calls.repository';

// Embedded PostgreSQL with the real migrations: no application database is contacted.
test('call history across workspaces on PostgreSQL', async (t) => {
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema });
  t.after(() => pg.close());
  await migrate(pg);

  const calls = new DrizzleCallsRepository(transactionHost(db) as never);
  const seed = seedConversations(db);

  await t.test('lists direct calls from every workspace the person is in', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const cat = await seed.person('Cat');
    const office = await seed.workspace();
    const client = await seed.workspace();
    const annAtOffice = await seed.join(office, ann);
    const catAtClient = await seed.join(client, cat);
    const withBob = await seed.conversation(annAtOffice, await seed.join(office, bob));
    const withCat = await seed.conversation(await seed.join(client, ann), catAtClient);
    await seed.call(withBob, annAtOffice, 'ended');
    await seed.call(withCat, catAtClient, 'ended');
    const general = { workspaceId: office, channelId: randomUUID(), seq: 0n };
    await db.insert(schema.channels).values({
      id: general.channelId,
      workspaceId: office,
      kind: 'public',
      name: 'General',
      createdByMemberId: annAtOffice.id,
    });
    await seed.call(general, annAtOffice, 'ended');

    const history = await calls.listForUser(ann.oidcUserId, 'all', undefined, 10);

    assert.deepEqual(
      history.map((call) => [call.workspaceId, call.participant.displayName]),
      [
        [client, 'Cat'],
        [office, 'Bob'],
      ],
    );
  });

  await t.test('counts only rings from the other side as missed', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const office = await seed.workspace();
    const annAtOffice = await seed.join(office, ann);
    const bobAtOffice = await seed.join(office, bob);
    const conversation = await seed.conversation(annAtOffice, bobAtOffice);
    await seed.call(conversation, annAtOffice, 'missed');
    const missedFromBob = await seed.call(conversation, bobAtOffice, 'missed');

    const missed = await calls.listForUser(ann.oidcUserId, 'missed', undefined, 10);

    assert.deepEqual(
      missed.map((call) => call.id),
      [missedFromBob],
    );
  });
});
