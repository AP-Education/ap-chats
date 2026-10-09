import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { eq } from 'drizzle-orm';

import { DrizzlePushAudienceRepository } from '@/components/notifications/alerts/repository/drizzle-push-audience.repository';
import { DrizzleHistoryRepository } from '@/components/social/history/repository/drizzle-history.repository';
import * as schema from '@/database/drizzle/schema';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { MentionsFacade } from './mentions.facade';
import { DrizzleMentionsRepository } from './repository/drizzle-mentions.repository';

test('mentions on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const txHost = transactionHost(db);
  const mentions = new MentionsFacade(new DrizzleMentionsRepository(txHost as never), {} as never);
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
      kind: 'public',
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

      await mentions.replace(message, { memberIds: [people.named], everyone: true });

      assert.deepEqual(
        await recipients(message.messageId),
        new Map([
          [people.named, 'direct'],
          [people.reader, 'everyone'],
        ]),
      );
    },
  );

  await t.test('editing the mention away drops everyone it reached', async () => {
    const { people, message } = await seedChannel();
    await mentions.replace(message, { memberIds: [people.named], everyone: true });

    await mentions.replace(message, { memberIds: [], everyone: false });

    assert.equal((await recipients(message.messageId)).size, 0);
  });

  await t.test('a reader on mentions only is alerted by @everyone', async () => {
    const { people, message } = await seedChannel();
    await mentions.replace(message, { memberIds: [], everyone: true });

    const range = { ...message, firstSeq: '1', lastSeq: '1' };
    const reader = await audience.memberRecipient(range, people.reader);

    assert.equal(reader?.mentioned, true);
    assert.equal(reader?.level, 'mentions');
  });

  await t.test(
    'history names only direct mentions but tells each viewer whether it reached them',
    async () => {
      const { people, message } = await seedChannel();
      await mentions.replace(message, { memberIds: [people.named], everyone: true });

      const pageFor = async (viewerMemberId: string) => {
        const view = { channelId: message.channelId, viewerMemberId };
        const { rows } = await history.page(view, 'before', undefined, 1n, 10);
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

  await t.test('@everyone is refused in a direct message', async () => {
    const dm = {
      id: randomUUID(),
      workspaceId: randomUUID(),
      kind: 'dm' as const,
      createdByMemberId: randomUUID(),
      lastEntrySeq: 0n,
    };

    await assert.rejects(mentions.requireValid(dm, { memberIds: [], everyone: true }));
  });
});
