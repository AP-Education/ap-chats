import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as schema from '@/database/drizzle/schema';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import type { NewAppUpdate } from '../types';
import { DrizzleUpdatesRepository } from './drizzle-updates.repository';

const manifest: schema.StoredUpdateManifest = {
  launchAsset: { hash: 'h', key: 'k', contentType: 'application/javascript', url: 'https://x' },
  assets: [],
};
const update = (overrides: Partial<NewAppUpdate> = {}): NewAppUpdate => ({
  kind: 'update',
  platform: 'ios',
  channel: 'production',
  runtimeVersion: 'fp-1',
  manifest,
  rolloutPercent: 10,
  mandatory: false,
  sourceUpdateId: null,
  gitCommit: 'abc1234',
  notes: null,
  createdBy: 'ci',
  ...overrides,
});

test('registers a runtime once, keeping the first build that shipped it', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());
  const updates = new DrizzleUpdatesRepository(transactionHost(db) as never);

  assert.equal(await updates.hasRuntime('ios', 'fp-1'), false);
  await updates.registerRuntime('ios', 'fp-1', 11);
  await updates.registerRuntime('ios', 'fp-1', 12);

  assert.equal(await updates.hasRuntime('ios', 'fp-1'), true);
  assert.equal(await updates.hasRuntime('android', 'fp-1'), false);
  assert.deepEqual(
    (await db.select().from(schema.appRuntimes)).map(({ buildNumber }) => buildNumber),
    [11],
  );
});

test('lists a channel newest first with launches summed over days', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());
  const updates = new DrizzleUpdatesRepository(transactionHost(db) as never);
  await updates.registerRuntime('ios', 'fp-1', 11);
  await updates.registerRuntime('android', 'fp-1', 40);

  const first = await updates.create(update());
  const second = await updates.create(update({ rolloutPercent: 50 }));
  await updates.create(update({ platform: 'android' }));
  await updates.create(update({ channel: 'preview' }));
  const launch = { platform: 'ios', runtimeVersion: 'fp-1', updateId: second } as const;
  await updates.countLaunch({ ...launch, isEmergencyLaunch: false, ok: true }, '2026-11-17');
  await updates.countLaunch({ ...launch, isEmergencyLaunch: true, ok: false }, '2026-11-18');

  const listed = await updates.list({ channel: 'production', platform: 'ios', limit: 20 });

  assert.deepEqual(
    listed.map(({ id, buildNumber, launches, successes, emergencyLaunches }) => ({
      id,
      buildNumber,
      launches,
      successes,
      emergencyLaunches,
    })),
    [
      { id: second, buildNumber: 11, launches: 2, successes: 1, emergencyLaunches: 1 },
      { id: first, buildNumber: 11, launches: 0, successes: 0, emergencyLaunches: 0 },
    ],
  );
  assert.equal((await updates.list({ channel: 'production', limit: 20 })).length, 3);
  assert.equal((await updates.list({ channel: 'production', limit: 1 })).length, 1);
});
