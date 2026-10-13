import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { eq } from 'drizzle-orm';

import { DrizzlePushAudienceRepository } from '@/components/notifications/alerts/repository/drizzle-push-audience.repository';
import { DrizzleHistoryRepository } from '@/components/social/history/repository/drizzle-history.repository';
import { RolesFacade } from '@/components/workspaces/roles';
import { DrizzleRolesRepository } from '@/components/workspaces/roles/repository';
import * as schema from '@/database/drizzle/schema';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { MentionsService } from './mentions.service';
import { DrizzleMentionsRepository } from './repository/drizzle-mentions.repository';

test('mentions on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const txHost = transactionHost(db);
  const mentions = new MentionsService(
    new DrizzleMentionsRepository(txHost as never),
    {} as never,
    new RolesFacade(new DrizzleRolesRepository(txHost as never)),
  );
  const history = new DrizzleHistoryRepository(txHost as never);
  const audience = new DrizzlePushAudienceRepository(txHost as never);

  // An author, a reader on mentions only, a named colleague and someone who left, all in one channel.
  async function seedChannel() {
    const workspaceId = randomUUID();
    const channelId = randomUUID();
    const people = {
      author: randomUUID(),
      reader: randomUUID(),
      named: randomUUID(),
      gone: randomUUID(),
    };

    await db.insert(schema.workspaces).values({ id: workspaceId, name: 'Workspace' });
    for (const [name, memberId] of Object.entries(people)) {
      const profileId = randomUUID();
      await db
        .insert(schema.userProfiles)
        .values({ id: profileId, oidcUserId: `${name}-${memberId}`, displayName: name });
      await db.insert(schema.workspaceMembers).values({
        id: memberId,
        workspaceId,
        userProfileId: profileId,
        status: name === 'gone' ? 'removed' : 'active',
      });
    }
    await db.insert(schema.channels).values({
      id: channelId,
      workspaceId,
      kind: 'channel',
      name: 'General',
      createdByMemberId: people.author,
    });
    await db.insert(schema.channelMemberships).values(
      Object.values(people).map((memberId) => ({
        workspaceId,
        channelId,
        memberId,
        notificationLevel:
          memberId === people.reader ? ('mentions' as const) : ('default' as const),
      })),
    );

    const messageId = randomUUID();
    await db.insert(schema.chatMessages).values({
      id: messageId,
      workspaceId,
      channelId,
      authorMemberId: people.author,
      contentMarkdown: 'Heads up :mention[everyone]',
      requestDigest: messageId,
      clientNonce: randomUUID(),
    });
    await db.insert(schema.channelEntries).values({ workspaceId, channelId, messageId, seq: 1n });
    await db
      .update(schema.channels)
      .set({ lastEntrySeq: 1n })
      .where(eq(schema.channels.id, channelId));

    const message = { workspaceId, channelId, messageId, authorMemberId: people.author };
    return { people, message };
  }

  async function seedRole(workspaceId: string, memberIds: string[]) {
    const roleId = randomUUID();
    await db.insert(schema.roles).values({ id: roleId, workspaceId, name: `Role ${roleId}` });
    if (memberIds.length)
      await db
        .insert(schema.roleMembers)
        .values(memberIds.map((memberId) => ({ workspaceId, roleId, memberId })));
    return roleId;
  }

  async function seedOutsider(workspaceId: string) {
    const memberId = randomUUID();
    const profileId = randomUUID();
    await db
      .insert(schema.userProfiles)
      .values({ id: profileId, oidcUserId: `outsider-${memberId}`, displayName: 'outsider' });
    await db
      .insert(schema.workspaceMembers)
      .values({ id: memberId, workspaceId, userProfileId: profileId, status: 'active' });
    return memberId;
  }

  async function recipients(messageId: string) {
    const rows = await db
      .select({ memberId: schema.messageMentions.memberId, via: schema.messageMentions.via })
      .from(schema.messageMentions)
      .where(eq(schema.messageMentions.messageId, messageId));
    return new Map(rows.map((row) => [row.memberId, row.via]));
  }

  await t.test(
    '@everyone reaches every other active member; a named one stays direct',
    async () => {
      const { people, message } = await seedChannel();

      await mentions.replace(message, { memberIds: [people.named], roleIds: [], everyone: true });

      assert.deepEqual(
        await recipients(message.messageId),
        new Map([
          [people.named, 'direct'],
          [people.reader, 'everyone'],
        ]),
      );
    },
  );

  await t.test(
    'a role reaches its people in the channel, but not the author or anyone outside it',
    async () => {
      const { people, message } = await seedChannel();
      const outsider = await seedOutsider(message.workspaceId);
      const roleId = await seedRole(message.workspaceId, [
        people.author,
        people.reader,
        people.named,
        people.gone,
        outsider,
      ]);

      await mentions.replace(message, {
        memberIds: [people.named],
        roleIds: [roleId],
        everyone: false,
      });

      assert.deepEqual(
        await recipients(message.messageId),
        new Map([
          [people.named, 'direct'],
          [people.reader, 'role'],
        ]),
      );

      const rolesFor = async (viewerMemberId: string) => {
        const { rows } = await history.page({
          channelId: message.channelId,
          viewerMemberId,
          direction: 'before',
          ceiling: 1n,
          limit: 10,
        });
        const [row] = rows;
        assert.equal(row?.type, 'MESSAGE');
        return row.rolesMentioningViewer;
      };
      assert.deepEqual(await rolesFor(people.reader), [roleId]);
      assert.deepEqual(await rolesFor(people.named), [roleId]);
      assert.deepEqual(await rolesFor(people.author), []);
    },
  );

  await t.test('a role must belong to the workspace', async () => {
    const { message } = await seedChannel();
    const channel = {
      id: message.channelId,
      workspaceId: message.workspaceId,
      kind: 'channel' as const,
      lastEntrySeq: 1n,
      canPost: true,
      canManage: false,
    };
    const elsewhere = randomUUID();
    await db.insert(schema.workspaces).values({ id: elsewhere, name: 'Elsewhere' });
    const foreignRole = await seedRole(elsewhere, []);

    await assert.rejects(
      mentions.requireValid(channel, { memberIds: [], roleIds: [foreignRole], everyone: false }),
    );
    await assert.doesNotReject(
      mentions.requireValid(channel, {
        memberIds: [],
        roleIds: [await seedRole(message.workspaceId, [])],
        everyone: false,
      }),
    );
  });

  await t.test('editing the mention away drops everyone it reached', async () => {
    const { people, message } = await seedChannel();
    await mentions.replace(message, { memberIds: [people.named], roleIds: [], everyone: true });

    await mentions.replace(message, { memberIds: [], roleIds: [], everyone: false });

    assert.equal((await recipients(message.messageId)).size, 0);
  });

  await t.test('a reader on mentions only is alerted by @everyone', async () => {
    const { people, message } = await seedChannel();
    await mentions.replace(message, { memberIds: [], roleIds: [], everyone: true });

    const range = { ...message, firstSeq: '1', lastSeq: '1' };
    const reader = await audience.memberRecipient(range, people.reader);

    assert.equal(reader?.mentioned, true);
    assert.equal(reader?.level, 'mentions');
  });

  await t.test(
    'history names only direct mentions but tells each viewer whether it reached them',
    async () => {
      const { people, message } = await seedChannel();
      await mentions.replace(message, { memberIds: [people.named], roleIds: [], everyone: true });

      const pageFor = async (viewerMemberId: string) => {
        const { rows } = await history.page({
          channelId: message.channelId,
          viewerMemberId,
          direction: 'before',
          ceiling: 1n,
          limit: 10,
        });
        const [row] = rows;
        assert.equal(row?.type, 'MESSAGE');
        return row;
      };

      const asReader = await pageFor(people.reader);
      assert.deepEqual(
        asReader.mentions.map((mention) => mention.memberId),
        [people.named],
      );
      assert.equal(asReader.mentionsViewer, true);
      assert.equal((await pageFor(people.named)).mentionsViewer, true);
      assert.equal((await pageFor(people.author)).mentionsViewer, false);
    },
  );

  await t.test('@everyone and roles are refused in a direct message', async () => {
    const dm = {
      id: randomUUID(),
      workspaceId: randomUUID(),
      kind: 'dm' as const,
      lastEntrySeq: 0n,
      canPost: true,
      canManage: false,
    };

    await assert.rejects(mentions.requireValid(dm, { memberIds: [], roleIds: [], everyone: true }));
    await assert.rejects(
      mentions.requireValid(dm, { memberIds: [], roleIds: [randomUUID()], everyone: false }),
    );
  });
});
