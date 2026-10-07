import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { type TransactionalAdapter, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { eq } from 'drizzle-orm';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';

import { DrizzleWebPushRepository } from '@/components/devices/browser/repository/drizzle-web-push.repository';
import { DrizzleDevicesRepository } from '@/components/devices/repository/drizzle-devices.repository';
import { EntriesFacade } from '@/components/social/entries/entries.facade';
import { DrizzleEntriesRepository } from '@/components/social/entries/repository/drizzle-entries.repository';
import { ForwardingFacade } from '@/components/social/forwarding/forwarding.facade';
import { DrizzleForwardingRepository } from '@/components/social/forwarding/repository/drizzle-forwarding.repository';
import { MessagesFacade } from '@/components/social/messages';
import { MessageMarkdownService } from '@/components/social/messages/content';
import { DrizzleMessagesRepository } from '@/components/social/messages/repository/drizzle-messages.repository';
import { DrizzleCallPushRepository } from '@/components/voip-push/repository/drizzle-call-push.repository';
import * as schema from '@/database/drizzle/schema';
import { jobId } from '@/globals/jobs/job-id';
import { IntegrationEvents } from '@/globals/publisher/integration-events';
import { OutboxDispatcher } from '@/globals/publisher/outbox-dispatcher';
import { PersistentEventOutbox } from '@/globals/publisher/persistent-event-outbox';
import { DrizzleEventOutboxRepository } from '@/globals/publisher/repository/drizzle-event-outbox.repository';

import { MessageNotificationContentService } from './alerts/message-notification-content.service';
import { DrizzlePushAudienceRepository } from './alerts/repository/drizzle-push-audience.repository';
import { NotificationPolicyService } from './policy';

// Embedded PostgreSQL with the real migrations: no application database is contacted.
test('push persistence on PostgreSQL', async (t) => {
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema });
  t.after(() => pg.close());

  // Two owners of one installation exist before the migration that makes installations unique.
  await migrate(pg, {
    before: '0018_push_delivery.sql',
    seed: `insert into devices (user_id, installation_id, platform, push_token, updated_at) values
      ('previous-owner', 'shared-install', 'ios', 'old-token', '2026-01-01'),
      ('current-owner', 'shared-install', 'ios', 'new-token', '2026-02-01')`,
  });

  const txHost = transactionHost(db);
  const devices = new DrizzleDevicesRepository(txHost as never);
  const subscriptions = new DrizzleWebPushRepository(txHost as never);
  const audience = new DrizzlePushAudienceRepository(txHost as never);
  const outboxRepository = new DrizzleEventOutboxRepository(txHost as never);
  const outbox = new PersistentEventOutbox(outboxRepository);

  // A workspace with an author and a reader in one channel; each test gets its own.
  async function seedConversation(level: 'default' | 'mentions' = 'default') {
    const ids = {
      workspaceId: randomUUID(),
      channelId: randomUUID(),
      authorId: randomUUID(),
      readerId: randomUUID(),
    };
    const [authorProfile, readerProfile] = [randomUUID(), randomUUID()];
    const readerUserId = `reader-${ids.readerId}`;
    let seq = 0n;

    await db.insert(schema.workspaces).values({ id: ids.workspaceId, name: 'Workspace' });
    await db.insert(schema.userProfiles).values([
      { id: authorProfile, oidcUserId: `author-${ids.authorId}`, displayName: 'Author' },
      { id: readerProfile, oidcUserId: readerUserId },
    ]);
    await db.insert(schema.workspaceMembers).values([
      { id: ids.authorId, workspaceId: ids.workspaceId, userProfileId: authorProfile },
      { id: ids.readerId, workspaceId: ids.workspaceId, userProfileId: readerProfile },
    ]);
    await db.insert(schema.channels).values({
      id: ids.channelId,
      workspaceId: ids.workspaceId,
      kind: 'private',
      name: 'Private',
      createdByMemberId: ids.authorId,
    });
    await db.insert(schema.channelMemberships).values({
      workspaceId: ids.workspaceId,
      channelId: ids.channelId,
      memberId: ids.readerId,
      notificationLevel: level,
    });

    async function post(markdown: string, options: { mention?: boolean } = {}) {
      const messageId = randomUUID();
      seq += 1n;

      await db.insert(schema.chatMessages).values({
        id: messageId,
        workspaceId: ids.workspaceId,
        channelId: ids.channelId,
        authorMemberId: ids.authorId,
        contentMarkdown: markdown,
        requestDigest: messageId,
        clientNonce: randomUUID(),
      });
      await db
        .insert(schema.channelEntries)
        .values({ workspaceId: ids.workspaceId, channelId: ids.channelId, messageId, seq });
      await db
        .update(schema.channels)
        .set({ lastEntrySeq: seq })
        .where(eq(schema.channels.id, ids.channelId));
      if (options.mention) {
        await db.insert(schema.messageMentions).values({
          workspaceId: ids.workspaceId,
          channelId: ids.channelId,
          messageId,
          memberId: ids.readerId,
        });
      }

      return messageId;
    }

    const alertFor = (firstSeq: string) => ({
      id: randomUUID(),
      workspaceId: ids.workspaceId,
      channelId: ids.channelId,
      firstSeq,
      lastSeq: firstSeq,
      userId: readerUserId,
      memberId: ids.readerId,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    return { ...ids, readerUserId, post, alertFor };
  }

  await t.test('the migration keeps only the newest owner of a shared installation', async () => {
    const owners = await db.select().from(schema.devices);

    assert.deepEqual(
      owners.map((device) => device.userId),
      ['current-owner'],
    );
  });

  await t.test(
    'the previous owner of an installation cannot drop the new owner tokens',
    async () => {
      await devices.register('owner-A', {
        installationId: 'install',
        platform: 'ios',
        pushToken: 'A',
      });
      const [previous] = await devices.listForUser('owner-A');
      await devices.register('owner-B', {
        installationId: 'install',
        platform: 'ios',
        pushToken: 'B',
      });

      await devices.unregister('owner-A', 'install');
      await devices.invalidateToken(previous!.id, 'A', 'push');

      const current = await devices.find(previous!.id);
      assert.equal(current?.userId, 'owner-B');
      assert.equal(current?.pushToken, 'B');
    },
  );

  await t.test('the previous owner of a browser subscription cannot touch it', async () => {
    const registration = {
      installationId: randomUUID(),
      endpoint: 'https://fcm.googleapis.com/push/one',
      keys: { p256dh: 'key', auth: 'old' },
    };
    const { id } = await subscriptions.register('owner-A', registration);
    const previous = await subscriptions.find(id);
    await subscriptions.register('owner-B', {
      ...registration,
      keys: { p256dh: 'key', auth: 'new' },
    });

    await subscriptions.remove('owner-A', id);
    await subscriptions.invalidate(previous!);
    await subscriptions.presence('owner-A', id, { focused: true });

    const current = await subscriptions.find(id);
    assert.equal(current?.userId, 'owner-B');
    assert.equal(current?.activeUntil, null, 'only the owner sets presence');
  });

  await t.test('recipients follow mentions, level, read cursor and membership', async () => {
    const chat = await seedConversation('mentions');
    await chat.post('hello', { mention: true });
    const scope = { ...chat, firstSeq: '1', lastSeq: '1' };

    const [recipient] = await audience.recipients(scope);
    assert.equal(recipient?.mentioned, true);
    assert.equal(recipient?.level, 'mentions');

    await db
      .update(schema.channelMemberships)
      .set({ lastReadEntrySeq: 1n })
      .where(eq(schema.channelMemberships.memberId, chat.readerId));
    assert.deepEqual(await audience.recipients(scope), [], 'already read');

    await db
      .update(schema.channelMemberships)
      .set({ lastReadEntrySeq: 0n })
      .where(eq(schema.channelMemberships.memberId, chat.readerId));
    await db
      .update(schema.workspaceMembers)
      .set({ status: 'removed' })
      .where(eq(schema.workspaceMembers.id, chat.readerId));
    assert.deepEqual(await audience.recipients(scope), [], 'left the workspace');
  });

  await t.test('an alert shows the newest unread message the person should see', async () => {
    const content = new MessageNotificationContentService(
      audience,
      new NotificationPolicyService(),
    );
    const chat = await seedConversation('mentions');
    const mention = await chat.post('**first** mention', { mention: true });
    const alert = chat.alertFor('1');

    await chat.post('ordinary');
    assert.equal(
      (await content.render(alert))?.body,
      'first mention',
      'mentions level skips chatter',
    );

    await chat.post('newer mention', { mention: true });
    assert.equal(
      (await content.render(alert))?.body,
      'newer mention',
      'not the triggering message',
    );

    await db
      .update(schema.chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(schema.chatMessages.contentMarkdown, 'newer mention'));
    await db
      .update(schema.chatMessages)
      .set({ contentMarkdown: '', attachments: [attachment()] })
      .where(eq(schema.chatMessages.id, mention));
    assert.equal((await content.render(alert))?.body, 'Нове вкладення');
  });

  await t.test(
    'a DM or call alert needs both peers active and the call still ringing',
    async () => {
      const chat = await seedConversation();
      const dmId = randomUUID();
      const callId = randomUUID();
      const [firstMemberId, secondMemberId] = [chat.authorId, chat.readerId].sort();
      await db.insert(schema.channels).values({
        id: dmId,
        workspaceId: chat.workspaceId,
        kind: 'dm',
        createdByMemberId: chat.authorId,
      });
      await db.insert(schema.directMessages).values({
        workspaceId: chat.workspaceId,
        channelId: dmId,
        firstMemberId: firstMemberId!,
        secondMemberId: secondMemberId!,
      });
      await db
        .insert(schema.channelMemberships)
        .values({ workspaceId: chat.workspaceId, channelId: dmId, memberId: chat.readerId });
      await db.insert(schema.calls).values({
        id: callId,
        workspaceId: chat.workspaceId,
        channelId: dmId,
        roomName: `room-${callId}`,
        startedByMemberId: chat.authorId,
      });
      const calls = new DrizzleCallPushRepository(txHost as never);
      const dm = { workspaceId: chat.workspaceId, channelId: dmId, firstSeq: '1', lastSeq: '1' };
      const isRinging = () =>
        calls.ringingForRecipient(chat.workspaceId, dmId, callId, chat.readerUserId);

      assert.equal((await audience.context(dm))?.kind, 'dm');
      assert.ok(await isRinging());

      await db
        .update(schema.workspaceMembers)
        .set({ status: 'removed' })
        .where(eq(schema.workspaceMembers.id, chat.authorId));
      assert.equal(await audience.context(dm), undefined);
      assert.equal(await isRinging(), null);

      await db
        .update(schema.workspaceMembers)
        .set({ status: 'active' })
        .where(eq(schema.workspaceMembers.id, chat.authorId));
      await db.update(schema.calls).set({ status: 'active' }).where(eq(schema.calls.id, callId));
      assert.equal(await isRinging(), null, 'answered calls stop ringing');
    },
  );

  await t.test('an outbox event commits with its transaction, once per ID', async () => {
    const rolledBack = jobId('rolled-back');
    const committed = jobId('committed');

    await assert.rejects(
      txHost.withTransaction(async () => {
        await outbox.record('test.event', { value: 1 }, { id: rolledBack });
        throw new Error('rollback');
      }),
    );
    await outbox.record('test.event', { value: 1 }, { id: committed });
    await outbox.record('test.event', { value: 2 }, { id: committed });

    const stored = await db.select().from(schema.eventOutbox);
    assert.deepEqual(
      stored.map((row) => [row.id, row.payload]),
      [[committed, { value: 1 }]],
    );
  });

  await t.test('the relay keeps an event until a subscriber queue accepts it', async () => {
    const id = jobId('committed');
    const queued = new Map<string, object>();
    let queueDown = true;
    const events = new IntegrationEvents({
      work: () => {},
      enqueue: async (_queue: string, payload: object, options: { id: string }) => {
        if (queueDown) throw new Error('Valkey unavailable');
        queued.set(options.id, payload);
      },
    } as never);
    events.subscribe('test.event', 'subscriber', async () => {});
    const relay = new OutboxDispatcher(outboxRepository, events, {} as never, {} as never);
    const stored = async () =>
      (await db.select().from(schema.eventOutbox).where(eq(schema.eventOutbox.id, id)))[0];

    await assert.rejects(relay.relay(), /Valkey unavailable/u);
    assert.ok(await stored(), 'a failed handoff keeps the event');

    queueDown = false;
    await relay.relay();
    await relay.relay();

    assert.deepEqual([...queued.values()], [{ value: 1 }], 'delivered exactly once');
    assert.equal(await stored(), undefined, 'an accepted event leaves the outbox');

    await outbox.record('test.expired', {}, { expireInSeconds: -1 });
    assert.deepEqual(await outboxRepository.claim(100), [], 'expired events are never relayed');
  });

  await t.test(
    'messages and forwards publish after commit, never on replay or rollback',
    async () => {
      const chat = await seedConversation();
      const published: string[] = [];
      let outboxDown = false;
      const realtime = {
        publish: (name: string) => {
          assert.equal(txHost.isTransactionActive(), false, 'only after commit');
          published.push(name);
        },
      };
      const transactionalOutbox = {
        record: async (name: string, payload: object) => {
          if (outboxDown) throw new Error('outbox unavailable');
          await outbox.record(name, payload);
        },
      };
      const access = { requirePostAccess: async () => {}, requireForwardAccess: async () => {} };
      const messages = new MessagesFacade(
        access as never,
        new EntriesFacade(new DrizzleEntriesRepository(txHost as never)),
        {} as never,
        { requireValid: async () => {}, replace: async () => {} } as never,
        new DrizzleMessagesRepository(txHost as never),
        new MessageMarkdownService(),
        realtime,
        transactionalOutbox,
        { claim: async () => [] } as never,
      );
      const forwarding = new ForwardingFacade(
        access as never,
        {} as never,
        messages,
        new DrizzleForwardingRepository(txHost as never),
        realtime,
        transactionalOutbox,
      );
      const author = { workspaceId: chat.workspaceId, id: chat.authorId } as never;
      const send = { markdown: 'publication', clientNonce: randomUUID() };
      const forward = (message: { id: string }) => ({
        sourceChannelId: chat.channelId,
        messageIds: [message.id],
        target: { kind: 'channel' as const, id: chat.channelId },
        batchNonce: randomUUID(),
      });

      const message = await messages.send(author, chat.channelId, send);
      await messages.send(author, chat.channelId, send);
      const batch = forward(message);
      await forwarding.forward(author, batch);
      await forwarding.forward(author, batch);
      assert.equal(published.length, 2, 'a replayed nonce publishes nothing');

      outboxDown = true;
      await assert.rejects(
        messages.send(author, chat.channelId, { ...send, clientNonce: randomUUID() }),
      );
      await assert.rejects(forwarding.forward(author, forward(message)));
      assert.equal(published.length, 2, 'a rolled back write publishes nothing');
    },
  );
});

async function migrate(pg: PGlite, options: { before: string; seed: string }) {
  const migrations = readdirSync('drizzle')
    .filter((name) => /^\d+.*\.sql$/u.test(name))
    .sort();
  const seedAt = migrations.indexOf(options.before);
  assert.ok(seedAt >= 0, `missing migration ${options.before}`);

  for (const [index, migration] of migrations.entries()) {
    if (index === seedAt) await pg.query(options.seed);
    await pg.exec(readFileSync(`drizzle/${migration}`, 'utf8'));
  }
}

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

function attachment() {
  return {
    id: randomUUID(),
    name: 'report.pdf',
    size: 100,
    mediaType: 'application/pdf',
    preview: null,
    width: null,
    height: null,
    description: null,
  };
}
