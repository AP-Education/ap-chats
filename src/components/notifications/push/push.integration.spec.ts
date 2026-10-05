import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { type TransactionalAdapter, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';

import {
  BrowserPushTargetsStrategy,
  NativePushTargetsStrategy,
  PushTargetsService,
} from '@/components/devices';
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
import { OutboxDispatcher } from '@/globals/publisher/outbox-dispatcher';
import { PersistentEventOutbox } from '@/globals/publisher/persistent-event-outbox';
import { DrizzleEventOutboxRepository } from '@/globals/publisher/repository/drizzle-event-outbox.repository';

import { NotificationPolicyService } from '../policy';
import { ConversationNotificationWorker } from './conversation-notification.worker';
import { MessageNotificationContentService } from './message-notification-content.service';
import { DrizzleNotificationWindowsRepository } from './repository/drizzle-notification-windows.repository';
import { DrizzlePushAudienceRepository } from './repository/drizzle-push-audience.repository';
import type { ConversationAlert, MessageNotificationSource } from './types';
import { PUSH_EXPO_DELIVERY_EVENT, PUSH_WEB_DELIVERY_EVENT } from './types';

// Embedded PostgreSQL: no application database or notification provider is contacted.
test('push migrations, devices, burst policy and durable outbox on PostgreSQL', async (t) => {
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema });
  t.after(() => pg.close());
  const migrations = readdirSync('drizzle')
    .filter((name) => /^\d+.*\.sql$/u.test(name))
    .sort();
  const pushMigration = '0018_push_delivery.sql';
  const pushMigrationIndex = migrations.indexOf(pushMigration);
  assert.ok(pushMigrationIndex >= 0);
  for (const migration of migrations.slice(0, pushMigrationIndex))
    await pg.exec(readFileSync(`drizzle/${migration}`, 'utf8'));
  await pg.query(`insert into devices (user_id, installation_id, platform, push_token, updated_at) values
    ('previous-owner', 'shared-install', 'ios', 'old-token', '2026-01-01'),
    ('current-owner', 'shared-install', 'ios', 'new-token', '2026-02-01')`);
  await pg.exec(readFileSync(`drizzle/${pushMigration}`, 'utf8'));
  assert.deepEqual(
    (await db.select().from(schema.devices)).map((device) => device.userId),
    ['current-owner'],
  );

  const adapter = new TransactionalAdapterDrizzleOrm<typeof db>({
    drizzleInstanceToken: Symbol('test-db'),
  });
  const txHost = new TransactionHost<TransactionalAdapter<typeof db, typeof db, object>>({
    ...adapter.optionsFactory(db),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: { isolationLevel: 'read committed' },
    extraProviderTokens: [],
  });
  const devices = new DrizzleDevicesRepository(txHost as never);
  const subscriptions = new DrizzleWebPushRepository(txHost as never);
  const audience = new DrizzlePushAudienceRepository(txHost as never);

  await t.test(
    'installation takeover prevents old logout and old receipt from deleting current tokens',
    async () => {
      await devices.register('owner-A', {
        installationId: 'install',
        platform: 'ios',
        pushToken: 'token-A',
        voipToken: 'voip-A',
        apnsEnvironment: 'sandbox',
      });
      const [old] = await devices.listForUser('owner-A');
      assert.ok(old);
      await devices.register('owner-B', {
        installationId: 'install',
        platform: 'ios',
        pushToken: 'token-B',
        voipToken: 'voip-B',
        apnsEnvironment: 'production',
      });
      await devices.unregister('owner-A', 'install');
      await devices.invalidateToken(old.id, 'token-A', 'push');
      const current = await devices.find(old.id);
      assert.equal(current?.userId, 'owner-B');
      assert.equal(current?.pushToken, 'token-B');
      assert.equal(current?.apnsEnvironment, 'production');
      await devices.register('owner-B', { installationId: 'install', platform: 'ios' });
      assert.equal((await devices.find(old.id))?.voipToken, 'voip-B');
      await devices.register('owner-B', {
        installationId: 'install',
        platform: 'ios',
        pushToken: null,
      });
      assert.equal((await devices.find(old.id))?.pushToken, null);
      assert.equal((await devices.find(old.id))?.voipToken, 'voip-B');
    },
  );

  await t.test(
    'old subscription cleanup cannot delete a rotated subscription or a new owner',
    async () => {
      const installationId = randomUUID();
      const keys = { p256dh: 'public-key', auth: 'old-auth' };
      const { id } = await subscriptions.register('owner-A', {
        installationId,
        endpoint: 'https://fcm.googleapis.com/push/one',
        keys,
      });
      const previous = await subscriptions.find(id);
      assert.ok(previous);
      await subscriptions.register('owner-B', {
        installationId,
        endpoint: previous.endpoint,
        keys: { ...keys, auth: 'new-auth' },
      });
      await subscriptions.remove('owner-A', id);
      await subscriptions.invalidate(previous);
      assert.equal((await subscriptions.find(id))?.userId, 'owner-B');
      await subscriptions.presence('owner-A', id, { focused: true });
      assert.equal((await subscriptions.find(id))?.activeUntil, null);
      await subscriptions.presence('owner-B', id, { focused: true });
      assert.ok((await subscriptions.find(id))?.activeUntil);
      assert.deepEqual(await subscriptions.forUser('owner-A'), []);
      assert.deepEqual(
        (await subscriptions.forUser('owner-B')).map((item) => item.id),
        [id],
      );
    },
  );

  const workspaceId = randomUUID();
  const channelId = randomUUID();
  const actorMemberId = randomUUID();
  const recipientId = randomUUID();
  const messageId = randomUUID();
  const actorProfile = randomUUID();
  const recipientProfile = randomUUID();
  await db.insert(schema.workspaces).values({ id: workspaceId, name: 'Workspace' });
  await db.insert(schema.userProfiles).values([
    { id: actorProfile, oidcUserId: 'author', displayName: 'Author' },
    { id: recipientProfile, oidcUserId: 'reader' },
  ]);
  await db.insert(schema.workspaceMembers).values([
    { id: actorMemberId, workspaceId, userProfileId: actorProfile },
    { id: recipientId, workspaceId, userProfileId: recipientProfile },
  ]);
  await db.insert(schema.channels).values({
    id: channelId,
    workspaceId,
    kind: 'private',
    name: 'Private',
    createdByMemberId: actorMemberId,
    lastEntrySeq: 11n,
  });
  await db
    .insert(schema.channelMemberships)
    .values({ workspaceId, channelId, memberId: recipientId, notificationLevel: 'mentions' });
  await db.insert(schema.chatMessages).values({
    id: messageId,
    workspaceId,
    channelId,
    authorMemberId: actorMemberId,
    contentMarkdown: '**message**',
    requestDigest: 'digest',
    clientNonce: randomUUID(),
  });
  await db.insert(schema.channelEntries).values({ workspaceId, channelId, messageId, seq: 10n });
  await db
    .insert(schema.messageMentions)
    .values({ workspaceId, channelId, messageId, memberId: recipientId });
  const event: MessageNotificationSource = {
    workspaceId,
    channelId,
    actorMemberId,
    firstSeq: '10',
    lastSeq: '10',
  };

  await t.test(
    'audience reads current mention, preferences, membership and read cursor',
    async () => {
      const [recipient] = await audience.recipients(event);
      assert.equal(recipient?.mentioned, true);
      assert.equal(recipient?.level, 'mentions');
      assert.equal(recipient?.userId, 'reader');
      await db
        .update(schema.channelMemberships)
        .set({ lastReadEntrySeq: 10n })
        .where(eq(schema.channelMemberships.memberId, recipientId));
      assert.deepEqual(await audience.recipients(event), []);
      await db
        .update(schema.channelMemberships)
        .set({ lastReadEntrySeq: 0n })
        .where(eq(schema.channelMemberships.memberId, recipientId));
      await db
        .update(schema.workspaceMembers)
        .set({ status: 'removed' })
        .where(eq(schema.workspaceMembers.id, recipientId));
      assert.deepEqual(await audience.recipients(event), []);
      await db
        .update(schema.workspaceMembers)
        .set({ status: 'active' })
        .where(eq(schema.workspaceMembers.id, recipientId));
    },
  );

  const batches = new DrizzleNotificationWindowsRepository(txHost as never);
  const [recipient] = await audience.recipients(event);
  assert.ok(recipient);
  const now = new Date();
  const alert = (overrides: Partial<ConversationAlert> = {}): ConversationAlert => ({
    id: randomUUID(),
    userId: 'reader',
    memberId: recipientId,
    workspaceId,
    channelId,
    firstSeq: '10',
    lastSeq: '11',
    expiresAt: new Date(now.getTime() + 3600000).toISOString(),
    ...overrides,
  });
  await t.test('reservations are idempotent and keep their original range on retry', async () => {
    const request = alert();
    const first = await batches.reserve(request, now, 30, 5);
    assert.ok(first);
    const retry = await batches.reserve({ ...request, lastSeq: '99' }, now, 30, 5);
    assert.deepEqual(retry, first);
    assert.equal((await db.select().from(schema.pushBatches)).length, 1);
  });

  await t.test('conversation cooldown and source watermark suppress duplicate alerts', async () => {
    assert.equal(
      await batches.reserve(alert({ lastSeq: '12' }), new Date(now.getTime() + 10000), 30, 5),
      null,
    );
    const next = await batches.reserve(
      alert({ lastSeq: '13' }),
      new Date(now.getTime() + 31000),
      30,
      5,
    );
    assert.ok(next);
    assert.equal((await batches.latest('reader', channelId))?.id, next.id);
    assert.equal(await batches.reserve(alert(), new Date(now.getTime() + 61000), 30, 5), null);
  });

  await t.test(
    'one user budget covers different conversations and is renewed after a minute',
    async () => {
      for (let index = 0; index < 6; index++) {
        const request = alert({ userId: 'budget-reader', channelId: randomUUID() });
        const result = await batches.reserve(request, now, 30, 5);
        assert.equal(Boolean(result), index < 5);
        if (index === 5)
          assert.ok(await batches.reserve(request, new Date(now.getTime() + 61000), 30, 5));
      }
    },
  );

  await t.test('a later ordinary message does not erase an earlier unread mention', async () => {
    const ordinary = randomUUID();
    await db.insert(schema.chatMessages).values({
      id: ordinary,
      workspaceId,
      channelId,
      authorMemberId: actorMemberId,
      contentMarkdown: 'ordinary',
      requestDigest: 'ordinary',
      clientNonce: randomUUID(),
    });
    await db
      .insert(schema.channelEntries)
      .values({ workspaceId, channelId, messageId: ordinary, seq: 11n });
    const scope = { ...event, lastSeq: '11' };
    assert.equal(
      (await audience.latestMessage(scope, recipient, true))?.contentMarkdown,
      '**message**',
    );
    assert.equal(
      (await audience.latestMessage(scope, recipient, false))?.contentMarkdown,
      'ordinary',
    );
    await db
      .update(schema.chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(schema.chatMessages.id, ordinary));
    assert.equal(
      (await audience.latestMessage(scope, recipient, false))?.contentMarkdown,
      '**message**',
    );
    await db
      .update(schema.chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(schema.chatMessages.id, messageId));
    assert.equal(await audience.latestMessage(scope, recipient, true), undefined);
  });

  const repository = new DrizzleEventOutboxRepository(txHost as never);
  const config = { get: () => true };
  const outbox = new PersistentEventOutbox(repository, config as never);
  await t.test(
    'outbox is atomic with the business transaction and stable IDs deduplicate',
    async () => {
      const cancelled = jobId('cancelled');
      await assert.rejects(
        txHost.withTransaction(async () => {
          await outbox.record('atomic', { value: 1 }, { id: cancelled });
          throw new Error('rollback');
        }),
        /rollback/u,
      );
      assert.equal(
        (await db.select().from(schema.eventOutbox).where(eq(schema.eventOutbox.id, cancelled)))
          .length,
        0,
      );
      const id = jobId('committed');
      await outbox.record('atomic', { value: 1 }, { id });
      await outbox.record('atomic', { value: 2 }, { id });
      assert.deepEqual(
        (await db.select().from(schema.eventOutbox).where(eq(schema.eventOutbox.id, id)))[0]
          ?.payload,
        { value: 1 },
      );
    },
  );

  await t.test(
    'outbox acknowledges queue handoff and retries failed enqueue with the same ID',
    async () => {
      const queued = new Map<string, object>();
      let unavailable = true;
      const dispatcher = new OutboxDispatcher(
        repository,
        {
          enqueue: async (_name: string, payload: object, options: { id: string }) => {
            if (unavailable) throw new Error('Valkey unavailable');
            queued.set(options.id, payload);
          },
        } as never,
        config as never,
        { error: () => {} } as never,
      );
      await assert.rejects(dispatcher.relay(), /Valkey unavailable/u);
      const id = jobId('committed');
      const stored = async () =>
        (await db.select().from(schema.eventOutbox).where(eq(schema.eventOutbox.id, id)))[0];
      assert.equal((await stored())?.publishedAt, null);
      assert.equal((await stored())?.leasedUntil, null);
      unavailable = false;
      const acknowledge = repository.acknowledge.bind(repository);
      let first = true;
      repository.acknowledge = async (eventId) => {
        if (first) {
          first = false;
          throw new Error('crash after enqueue');
        }
        await acknowledge(eventId);
      };
      await assert.rejects(dispatcher.relay(), /crash after enqueue/u);
      assert.equal((await stored())?.publishedAt, null);
      await dispatcher.relay();
      await dispatcher.relay();
      assert.equal(queued.size, 1);
      assert.deepEqual(queued.get(id), { value: 1 });
      assert.ok((await stored())?.publishedAt);
    },
  );

  await t.test(
    'failed fanout retries one reservation and stable per-device jobs without child outbox records',
    async () => {
      await db.delete(schema.pushBatches).where(eq(schema.pushBatches.userId, 'reader'));
      await db
        .update(schema.chatMessages)
        .set({ deletedAt: null })
        .where(eq(schema.chatMessages.id, messageId));
      await devices.register('reader', {
        installationId: 'native-reader',
        platform: 'ios',
        pushToken: 'ExpoPushToken[reader]',
      });
      await subscriptions.register('reader', {
        installationId: randomUUID(),
        endpoint: 'https://fcm.googleapis.com/push/reader',
        keys: { p256dh: 'key', auth: 'auth' },
      });
      const targets = new PushTargetsService(
        new NativePushTargetsStrategy(devices),
        new BrowserPushTargetsStrategy(subscriptions),
      );
      const settings = { PUSH_COOLDOWN_SECONDS: 30, PUSH_USER_ALERTS_PER_MINUTE: 5 };
      const appConfig = { get: (key: keyof typeof settings) => settings[key] };
      const content = new MessageNotificationContentService(
        audience,
        new NotificationPolicyService(),
      );
      const queued = new Map<string, { name: string; data: object }>();
      let fail = true;
      const worker = new ConversationNotificationWorker(
        {
          enqueue: async (name: string, data: object, options: { id: string }) => {
            if (name === PUSH_WEB_DELIVERY_EVENT && fail) throw new Error('enqueue failed');
            queued.set(options.id, { name, data });
          },
        } as never,
        audience,
        new NotificationPolicyService(),
        batches,
        appConfig as never,
        targets,
        {
          browserEnabled: true,
          resolve: (kind: string) => ({
            queueName: kind === 'expo' ? PUSH_EXPO_DELIVERY_EVENT : PUSH_WEB_DELIVERY_EVENT,
          }),
        } as never,
        content,
      );
      // A later source still picks the earlier eligible unread mention in the collected burst.
      const request = alert({ firstSeq: '11', lastSeq: '11' });
      await assert.rejects(worker.dispatchConversationAlert(request), /enqueue failed/u);
      assert.equal(queued.size, 1);
      fail = false;
      await worker.dispatchConversationAlert(request);
      await worker.dispatchConversationAlert(request);
      assert.equal(queued.size, 2);
      assert.equal(
        (await db.select().from(schema.pushBatches).where(eq(schema.pushBatches.userId, 'reader')))
          .length,
        1,
      );
      assert.ok([...queued.values()].some((job) => job.name === PUSH_EXPO_DELIVERY_EVENT));
      assert.ok(!JSON.stringify([...queued.values()]).includes('ExpoPushToken[reader]'));
      assert.equal((await db.select().from(schema.eventOutbox)).length, 1);
      const firstJob = [...queued.values()][0]!.data as { alert: ConversationAlert };
      assert.equal((await content.buildNotification(firstJob.alert))?.body, 'message');
      await db
        .update(schema.chatMessages)
        .set({
          contentMarkdown: '',
          attachments: [
            {
              id: randomUUID(),
              name: 'report.pdf',
              size: 100,
              mediaType: 'application/pdf',
              preview: null,
              width: null,
              height: null,
              description: null,
            },
          ],
        })
        .where(eq(schema.chatMessages.id, messageId));
      assert.equal((await content.buildNotification(firstJob.alert))?.body, 'Нове вкладення');
    },
  );

  await t.test(
    'DM message and call projections require both active peers and a ringing call',
    async () => {
      const dmId = randomUUID(),
        callId = randomUUID();
      await db
        .insert(schema.channels)
        .values({ id: dmId, workspaceId, kind: 'dm', createdByMemberId: actorMemberId });
      const [firstMemberId, secondMemberId] = [actorMemberId, recipientId].sort();
      await db.insert(schema.directMessages).values({
        workspaceId,
        channelId: dmId,
        firstMemberId: firstMemberId!,
        secondMemberId: secondMemberId!,
      });
      await db
        .insert(schema.channelMemberships)
        .values({ workspaceId, channelId: dmId, memberId: recipientId });
      await db.insert(schema.calls).values({
        id: callId,
        workspaceId,
        channelId: dmId,
        roomName: `room-${callId}`,
        startedByMemberId: actorMemberId,
      });
      const calls = new DrizzleCallPushRepository(txHost as never);
      const scope = { ...event, channelId: dmId };
      assert.equal((await audience.context(scope))?.kind, 'dm');
      assert.ok(await calls.ringingForRecipient(workspaceId, dmId, callId, 'reader'));
      await db
        .update(schema.workspaceMembers)
        .set({ status: 'removed' })
        .where(eq(schema.workspaceMembers.id, actorMemberId));
      assert.equal(await audience.context(scope), undefined);
      assert.equal(await calls.ringingForRecipient(workspaceId, dmId, callId, 'reader'), null);
      await db
        .update(schema.workspaceMembers)
        .set({ status: 'active' })
        .where(eq(schema.workspaceMembers.id, actorMemberId));
      await db.update(schema.calls).set({ status: 'active' }).where(eq(schema.calls.id, callId));
      assert.equal(await calls.ringingForRecipient(workspaceId, dmId, callId, 'reader'), null);
    },
  );

  await t.test('expired source events are not selected by the relay', async () => {
    await outbox.record('expired', {}, { id: jobId('expired') });
    await db
      .update(schema.eventOutbox)
      .set({ expiresAt: new Date(0) })
      .where(eq(schema.eventOutbox.id, jobId('expired')));
    assert.deepEqual(await repository.claim(), []);
  });

  await t.test(
    'message and forward publication follows commit and stays silent on nonce replay or rollback',
    async () => {
      const published: { name: string; payload: object }[] = [];
      let rejectOutbox = false;
      const events = {
        publish: (name: string, payload: unknown) => {
          assert.equal(txHost.isTransactionActive(), false);
          assert.ok(payload && typeof payload === 'object');
          published.push({ name, payload });
        },
      };
      const transactionalOutbox = {
        record: async (name: string, payload: object) => {
          assert.equal(txHost.isTransactionActive(), true);
          if (rejectOutbox) throw new Error('outbox unavailable');
          await outbox.record(name, payload);
        },
      };
      const access = {
        requirePostAccess: async () => {},
        requireForwardAccess: async () => {},
      };
      const messagesRepository = new DrizzleMessagesRepository(txHost as never);
      const messages = new MessagesFacade(
        access as never,
        new EntriesFacade(new DrizzleEntriesRepository(txHost as never)),
        {} as never,
        { requireValid: async () => {}, replace: async () => {} } as never,
        messagesRepository,
        new MessageMarkdownService(),
        events,
        transactionalOutbox,
        { claim: async () => [] } as never,
      );
      const forwarding = new ForwardingFacade(
        access as never,
        {} as never,
        messages,
        new DrizzleForwardingRepository(txHost as never),
        events,
        transactionalOutbox,
      );
      const member = { workspaceId, id: actorMemberId } as never;
      const send = { markdown: 'publication', clientNonce: randomUUID() };
      const message = await messages.send(member, channelId, send);
      assert.equal(published.length, 1);
      assert.deepEqual(await messages.send(member, channelId, send), message);
      assert.equal(published.length, 1);

      const forward = {
        sourceChannelId: channelId,
        messageIds: [message.id],
        target: { kind: 'channel' as const, id: channelId },
        batchNonce: randomUUID(),
      };
      const forwarded = await forwarding.forward(member, forward);
      assert.equal(published.length, 2);
      assert.deepEqual(await forwarding.forward(member, forward), forwarded);
      assert.equal(published.length, 2);

      const stored = await db.select().from(schema.eventOutbox);
      for (const event of published) {
        const storedEvent = stored.find((row) => row.name === event.name);
        assert.deepEqual(storedEvent?.payload, { ...event.payload });
      }
      const messageCount = (await db.select().from(schema.chatMessages)).length;
      rejectOutbox = true;
      await assert.rejects(
        messages.send(member, channelId, { ...send, clientNonce: randomUUID() }),
        /outbox unavailable/u,
      );
      await assert.rejects(
        forwarding.forward(member, { ...forward, batchNonce: randomUUID() }),
        /outbox unavailable/u,
      );
      assert.equal(published.length, 2);
      assert.equal((await db.select().from(schema.eventOutbox)).length, stored.length);
      assert.equal((await db.select().from(schema.chatMessages)).length, messageCount);
    },
  );
});
