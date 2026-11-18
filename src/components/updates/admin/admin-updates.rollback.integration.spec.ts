import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ConflictException, NotFoundException } from '@nestjs/common';

import * as schema from '@/database/drizzle/schema';
import type { Logger } from '@/globals/logger';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { selectUpdate } from '../expo/helpers/select-update';
import { DrizzleUpdatesRepository } from '../repository';
import { AdminUpdatesService } from './admin-updates.service';

const bundle = (name: string): Required<schema.StoredUpdateManifest> => ({
  launchAsset: {
    hash: name.padEnd(43, 'x'),
    key: name,
    contentType: 'application/javascript',
    url: `https://cdn.test/${name}`,
  },
  assets: [],
  expoClient: { name: 'AP App' },
});
const target = { platform: 'ios', channel: 'production', runtimeVersion: 'fp-1' } as const;

async function setup() {
  const { pg, db } = await migratedDatabase();
  const updates = new DrizzleUpdatesRepository(transactionHost(db) as never);
  const logger = { info: () => undefined, warn: () => undefined } as unknown as Logger;
  const admin = new AdminUpdatesService(updates, logger);
  await updates.registerRuntime('ios', 'fp-1', 11);
  const publish = async (name: string, rolloutPercent = 100) =>
    (await admin.publish({ ...target, manifest: bundle(name), rolloutPercent })).id;
  /** What a phone already running the newest update would be offered next. */
  const offeredTo = async (installationId: string) =>
    selectUpdate(await updates.findOffered(target), installationId);
  return { pg, db, updates, admin, publish, offeredTo };
}

test('republishes the previous bundle as a newer update and revokes the bad one', async (t) => {
  const { pg, db, admin, publish, offeredTo } = await setup();
  t.after(() => pg.close());
  const good = await publish('good');
  const bad = await publish('bad');

  const result = await admin.rollback(bad);

  assert.equal(result.kind, 'update');
  assert.equal(result.sourceUpdateId, good);
  assert.notEqual(result.id, good);
  const offered = await offeredTo('phone-1');
  assert.equal(offered?.id, result.id);
  assert.deepEqual(offered?.manifest, bundle('good'));
  assert.equal(offered?.mandatory, true);
  const rows = await db.select().from(schema.appUpdates);
  assert.equal(rows.find(({ id }) => id === bad)?.status, 'revoked');
  assert.equal(rows.find(({ id }) => id === good)?.status, 'active');
});

test('returns phones to the embedded bundle when nothing older is offered', async (t) => {
  const { pg, admin, publish, offeredTo } = await setup();
  t.after(() => pg.close());
  const only = await publish('only');

  const result = await admin.rollback(only);

  assert.deepEqual(result, { id: result.id, kind: 'rollback_to_embedded', sourceUpdateId: null });
  assert.equal((await offeredTo('phone-1'))?.kind, 'rollback_to_embedded');
});

test('goes back to the embedded bundle on request even with an older update offered', async (t) => {
  const { pg, admin, publish } = await setup();
  t.after(() => pg.close());
  await publish('good');
  const bad = await publish('bad');

  assert.equal((await admin.rollback(bad, true)).kind, 'rollback_to_embedded');
});

test('skips a paused update when picking what to republish', async (t) => {
  const { pg, admin, publish } = await setup();
  t.after(() => pg.close());
  const good = await publish('good');
  const paused = await publish('paused');
  await admin.pause(paused);
  const bad = await publish('bad');

  assert.equal((await admin.rollback(bad)).sourceUpdateId, good);
});

test('pausing stops the offer and widening the rollout resumes it', async (t) => {
  const { pg, admin, publish, offeredTo } = await setup();
  t.after(() => pg.close());
  const update = await publish('update', 10);

  await admin.pause(update);
  assert.equal(await offeredTo('phone-1'), null);

  await admin.setRollout(update, 100);
  assert.equal((await offeredTo('phone-1'))?.id, update);
});

test('refuses to touch an unknown or already revoked update, or to roll back a rollback', async (t) => {
  const { pg, admin, publish } = await setup();
  t.after(() => pg.close());
  const bad = await publish('bad');
  const rollback = await admin.rollback(bad);

  await assert.rejects(admin.rollback('00000000-0000-4000-8000-000000000000'), NotFoundException);
  await assert.rejects(admin.rollback(bad), ConflictException);
  await assert.rejects(admin.setRollout(bad, 50), ConflictException);
  await assert.rejects(admin.pause(bad), ConflictException);
  await assert.rejects(admin.rollback(rollback.id), ConflictException);
});
