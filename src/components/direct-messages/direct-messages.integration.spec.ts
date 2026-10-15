import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DrizzleWorkspaceMembersRepository } from '@/components/workspaces/members/repository/drizzle-workspace-members.repository';
import * as schema from '@/database/drizzle/schema';
import { seedConversations } from '@/testing/conversations';
import { directMessageServices } from '@/testing/direct-messages';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

// Embedded PostgreSQL with the real migrations: no application database is contacted.
test('direct messages across workspaces on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const { inbox, conversations } = directMessageServices(transactionHost(db));
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

    const page = await inbox.list(ann.oidcUserId);

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

    const opened = await inbox.get(ann.oidcUserId, atOffice.channelId);
    const listed = await inbox.list(ann.oidcUserId);

    assert.equal(opened.participant.displayName, 'Bob');
    assert.deepEqual(
      listed.items.map((item) => item.id),
      [atOffice.channelId],
    );
    await assert.rejects(inbox.get(ann.oidcUserId, atClient.channelId), NotFoundException);
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

    const unread = await inbox.unread(ann.oidcUserId);

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

    const opened = await conversations.open(annAtClient, bobAtClient.id);
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

    const opened = await conversations.open(annAtClient, bobAtClient.id);

    assert.equal(opened.id, atClient.channelId);
  });

  await t.test('a conversation mutes by the same rules as any channel', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const office = await seed.workspace();
    const annAtOffice = await seed.join(office, ann);
    const { channelId } = await seed.conversation(annAtOffice, await seed.join(office, bob));
    await db
      .update(schema.channelMemberships)
      .set({ notificationLevel: 'none' })
      .where(eq(schema.channelMemberships.memberId, annAtOffice.id));

    const silenced = await inbox.get(ann.oidcUserId, channelId);
    assert.equal(silenced.notification.isMuted, true, 'hearing nothing reads as muted');

    const unmuted = await conversations.mute(annAtOffice, channelId, 'unmute');
    assert.equal(unmuted.notification.isMuted, false, 'unmuting brings the sound back');
  });

  await t.test('a bot takes no direct messages and is no one to talk to', async () => {
    const ann = await seed.person('Ann');
    const bob = await seed.person('Bob');
    const starMe = await seed.person('StarMe', { isBot: true });
    const office = await seed.workspace();
    const annAtOffice = await seed.join(office, ann);
    await seed.join(office, bob);
    const starMeAtOffice = await seed.join(office, starMe);
    const people = new DrizzleWorkspaceMembersRepository(transactionHost(db) as never);

    await assert.rejects(
      conversations.findOrCreate(annAtOffice, starMeAtOffice.id),
      ForbiddenException,
    );

    const found = await people.search(office, annAtOffice.id, '');
    assert.deepEqual(
      found.map(({ displayName }) => displayName),
      ['Bob'],
    );
  });
});
