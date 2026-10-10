import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '@/database/drizzle/schema';
import { seedConversations } from '@/testing/conversations';
import { migrate, transactionHost } from '@/testing/pglite';

import { DirectMessagesService } from './direct-messages.service';

// Embedded PostgreSQL with the real migrations: no application database is contacted.
test('direct messages across workspaces on PostgreSQL', async (t) => {
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema });
  t.after(() => pg.close());
  await migrate(pg);

  const directMessages = new DirectMessagesService(transactionHost(db) as never);
  const seed = seedConversations(db);

  await t.test('lists conversations from every workspace the person is in', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const cat = await seed.person('Cat');
    const office = await seed.workspace();
    const client = await seed.workspace();
    const bobAtOffice = await seed.join(office, bob);
    const catAtClient = await seed.join(client, cat);
    const withBob = await seed.conversation(await seed.join(office, ann), bobAtOffice);
    const withCat = await seed.conversation(await seed.join(client, ann), catAtClient);
    await seed.post(withBob, bobAtOffice);
    await seed.post(withCat, catAtClient);

    const page = await directMessages.list(ann.oidcUserId);

    assert.deepEqual(
      page.items.map((item) => [item.workspaceId, item.participant.displayName]),
      [
        [client, 'Cat'],
        [office, 'Bob'],
      ],
    );
  });

  await t.test('opens any of them and hides those of a workspace left', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const office = await seed.workspace();
    const client = await seed.workspace();
    const annAtClient = await seed.join(client, ann);
    const bobAtOffice = await seed.join(office, bob);
    const bobAtClient = await seed.join(client, bob);
    const atOffice = await seed.conversation(await seed.join(office, ann), bobAtOffice);
    const atClient = await seed.conversation(annAtClient, bobAtClient);
    await seed.post(atOffice, bobAtOffice);
    await seed.post(atClient, bobAtClient);
    await db
      .update(schema.workspaceMembers)
      .set({ status: 'removed' })
      .where(eq(schema.workspaceMembers.id, annAtClient.id));

    const opened = await directMessages.get(ann.oidcUserId, atOffice.channelId);
    const listed = await directMessages.list(ann.oidcUserId);

    assert.equal(opened.participant.displayName, 'Bob');
    assert.deepEqual(
      listed.items.map((item) => item.id),
      [atOffice.channelId],
    );
    await assert.rejects(directMessages.get(ann.oidcUserId, atClient.channelId), NotFoundException);
  });

  await t.test('gathers unread conversations from every workspace', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const cat = await seed.person('Cat');
    const office = await seed.workspace();
    const client = await seed.workspace();
    const annAtClient = await seed.join(client, ann);
    const bobAtOffice = await seed.join(office, bob);
    const catAtClient = await seed.join(client, cat);
    const withBob = await seed.conversation(await seed.join(office, ann), bobAtOffice);
    const withCat = await seed.conversation(annAtClient, catAtClient);
    await seed.post(withBob, bobAtOffice);
    await seed.post(withBob, bobAtOffice);
    await seed.post(withCat, catAtClient);
    await seed.post(withCat, annAtClient);

    const unread = await directMessages.unread(ann.oidcUserId);

    assert.deepEqual(
      unread.map((item) => [item.participant.displayName, item.unreadCount]),
      [
        ['Cat', 1],
        ['Bob', 2],
      ],
    );
  });

  await t.test('reuses a conversation from another shared workspace', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const office = await seed.workspace();
    const client = await seed.workspace();
    const atOffice = await seed.conversation(
      await seed.join(office, ann),
      await seed.join(office, bob),
    );
    const annAtClient = await seed.join(client, ann);
    const bobAtClient = await seed.join(client, bob);

    const opened = await directMessages.open(annAtClient, bobAtClient.id);
    const pairsAtClient = await db
      .select()
      .from(schema.directMessages)
      .where(eq(schema.directMessages.workspaceId, client));

    assert.equal(opened.id, atOffice.channelId);
    assert.equal(opened.workspaceId, office);
    assert.equal(pairsAtClient.length, 0);
  });

  await t.test('prefers the conversation of the current workspace', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const office = await seed.workspace();
    const client = await seed.workspace();
    const annAtClient = await seed.join(client, ann);
    const bobAtClient = await seed.join(client, bob);
    const bobAtOffice = await seed.join(office, bob);
    const atClient = await seed.conversation(annAtClient, bobAtClient);
    const atOffice = await seed.conversation(await seed.join(office, ann), bobAtOffice);
    await seed.post(atOffice, bobAtOffice);

    const opened = await directMessages.open(annAtClient, bobAtClient.id);

    assert.equal(opened.id, atClient.channelId);
  });
});
