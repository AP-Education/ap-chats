import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as schema from '@/database/drizzle/schema';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { DrizzleUpdatesRepository } from './drizzle-updates.repository';

async function setup() {
  const { pg, db } = await migratedDatabase();
  const updates = new DrizzleUpdatesRepository(transactionHost(db) as never);
  await db
    .insert(schema.appRuntimes)
    .values({ platform: 'ios', runtimeVersion: 'fp-1', buildNumber: 11 });
  const [update] = await db
    .insert(schema.appUpdates)
    .values({
      platform: 'ios',
      channel: 'production',
      runtimeVersion: 'fp-1',
      manifest: {
        launchAsset: {
          hash: 'h',
          key: 'k',
          contentType: 'application/javascript',
          url: 'https://x',
        },
        assets: [],
      },
      rolloutPercent: 10,
    })
    .returning();
  return { pg, db, updates, updateId: update!.id };
}

const launch = {
  platform: 'ios',
  runtimeVersion: 'fp-1',
  isEmergencyLaunch: false,
  ok: true,
} as const;

test('adds launches of one bundle on one day into a single row', async (t) => {
  const { pg, db, updates, updateId } = await setup();
  t.after(() => pg.close());

  await updates.countLaunch({ ...launch, updateId }, '2026-11-17');
  await updates.countLaunch({ ...launch, updateId, ok: false }, '2026-11-17');
  await updates.countLaunch({ ...launch, updateId, isEmergencyLaunch: true }, '2026-11-17');
  await updates.countLaunch({ ...launch, updateId }, '2026-11-18');

  const rows = await db
    .select()
    .from(schema.appUpdateLaunchStats)
    .orderBy(schema.appUpdateLaunchStats.day);
  assert.deepEqual(
    rows.map(({ day, launches, successes, emergencyLaunches }) => ({
      day,
      launches,
      successes,
      emergencyLaunches,
    })),
    [
      { day: '2026-11-17', launches: 3, successes: 2, emergencyLaunches: 1 },
      { day: '2026-11-18', launches: 1, successes: 1, emergencyLaunches: 0 },
    ],
  );
});

test('counts the embedded bundle in its own row', async (t) => {
  const { pg, db, updates } = await setup();
  t.after(() => pg.close());

  await updates.countLaunch({ ...launch, updateId: null }, '2026-11-17');
  await updates.countLaunch({ ...launch, updateId: null }, '2026-11-17');

  const rows = await db.select().from(schema.appUpdateLaunchStats);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.updateId, null);
  assert.equal(rows[0]!.launches, 2);
});

test('drops reports for runtimes and updates that were never published', async (t) => {
  const { pg, db, updates, updateId } = await setup();
  t.after(() => pg.close());

  await updates.countLaunch(
    { ...launch, runtimeVersion: 'fp-unknown', updateId: null },
    '2026-11-17',
  );
  await updates.countLaunch(
    { ...launch, updateId: '00000000-0000-4000-8000-000000000000' },
    '2026-11-17',
  );
  await updates.countLaunch({ ...launch, platform: 'android', updateId }, '2026-11-17');

  assert.deepEqual(await db.select().from(schema.appUpdateLaunchStats), []);
});
