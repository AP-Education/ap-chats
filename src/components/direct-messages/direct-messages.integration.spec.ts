import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { ForbiddenException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/pglite';

import { DrizzleChannelAccessRepository } from '@/components/communities/channel-access/repository/drizzle-channel-access.repository';
import { DrizzleWorkspaceMembersRepository } from '@/components/workspaces/members/repository/drizzle-workspace-members.repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import * as schema from '@/database/drizzle/schema';
import { migrate, type TestDatabase, transactionHost } from '@/testing/pglite';

import { DirectMessagesService } from './direct-messages.service';

// Embedded PostgreSQL with the real migrations: no application database is contacted.
test('A bot takes no direct messages', async (t) => {
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema });
  t.after(() => pg.close());
  await migrate(pg);

  const txHost = transactionHost(db);
  const directMessages = new DirectMessagesService(txHost as never);
  const access = new DrizzleChannelAccessRepository(txHost as never);
  const people = new DrizzleWorkspaceMembersRepository(txHost as never);
  const seed = seeder(db);

  const office = await seed.workspace();
  const vlad = await seed.member(office, 'Влад');
  const ilya = await seed.member(office, 'Ілля');
  const starMe = await seed.member(office, 'StarMe', true);
  const asVlad = { id: vlad, workspaceId: office } as WorkspaceMember;

  await t.test('opening one with a bot is refused', async () => {
    await assert.rejects(directMessages.findOrCreate(asVlad, starMe), ForbiddenException);
  });

  await t.test('one opened with a bot before cannot be written to', async () => {
    const withStarMe = await seed.direct(office, vlad, starMe);
    const withIlya = await seed.direct(office, vlad, ilya);

    assert.equal(await access.isDmPeerReachable(withStarMe, vlad), false);
    assert.equal(await access.isDmPeerReachable(withIlya, vlad), true);
  });

  await t.test('people to talk to leave bots out', async () => {
    const found = await people.search(office, vlad, '');

    assert.deepEqual(found.map(({ displayName }) => displayName).sort(), ['Ілля']);
  });
});

function seeder(db: TestDatabase) {
  return {
    async workspace() {
      const [workspace] = await db.insert(schema.workspaces).values({ name: 'Office' }).returning();
      return workspace!.id;
    },

    async member(workspaceId: string, displayName: string, isBot = false) {
      const [profile] = await db
        .insert(schema.userProfiles)
        .values({ oidcUserId: `${displayName}-${randomUUID()}`, displayName, isBot })
        .returning();
      const [member] = await db
        .insert(schema.workspaceMembers)
        .values({ workspaceId, userProfileId: profile!.id })
        .returning();
      return member!.id;
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
  };
}
