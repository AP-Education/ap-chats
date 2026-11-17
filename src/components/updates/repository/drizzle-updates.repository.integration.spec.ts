import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as schema from '@/database/drizzle/schema';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import { DrizzleUpdatesRepository } from './drizzle-updates.repository';

const manifest: schema.StoredUpdateManifest = {
  launchAsset: {
    hash: 'aGFzaA',
    key: 'bundle',
    contentType: 'application/javascript',
    url: 'https://cdn.test/bundle',
  },
  assets: [],
};

test('offers only active updates of one runtime and channel, newest first', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());
  const updates = new DrizzleUpdatesRepository(transactionHost(db) as never);

  await db.insert(schema.appRuntimes).values([
    { platform: 'ios', runtimeVersion: 'fp-1', buildNumber: 11 },
    { platform: 'ios', runtimeVersion: 'fp-2', buildNumber: 12 },
    { platform: 'android', runtimeVersion: 'fp-1', buildNumber: 11 },
  ]);
  const at = (minute: number) => new Date(Date.UTC(2026, 10, 17, 10, minute));
  const offered = { platform: 'ios', channel: 'production', runtimeVersion: 'fp-1' } as const;
  const [older, newer, rollback] = await db
    .insert(schema.appUpdates)
    .values([
      { ...offered, manifest, rolloutPercent: 100, createdAt: at(1) },
      { ...offered, manifest, rolloutPercent: 10, mandatory: true, createdAt: at(2) },
      { ...offered, kind: 'rollback_to_embedded', rolloutPercent: 100, createdAt: at(3) },
    ])
    .returning();
  await db.insert(schema.appUpdates).values([
    { ...offered, manifest, rolloutPercent: 100, status: 'paused', createdAt: at(4) },
    { ...offered, manifest, rolloutPercent: 100, status: 'revoked', createdAt: at(5) },
    { ...offered, channel: 'preview', manifest, rolloutPercent: 100, createdAt: at(6) },
    { ...offered, runtimeVersion: 'fp-2', manifest, rolloutPercent: 100, createdAt: at(7) },
    { ...offered, platform: 'android', manifest, rolloutPercent: 100, createdAt: at(8) },
  ]);

  const found = await updates.findOffered(offered);

  assert.deepEqual(
    found.map(({ id }) => id),
    [rollback!.id, newer!.id, older!.id],
  );
  assert.deepEqual(found[1], {
    id: newer!.id,
    kind: 'update',
    runtimeVersion: 'fp-1',
    manifest,
    rolloutPercent: 10,
    mandatory: true,
    createdAt: at(2),
  });
  assert.equal(found[0]!.manifest, null);
});

test('refuses an update for a runtime no store build has', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  await assert.rejects(
    db.insert(schema.appUpdates).values({
      platform: 'ios',
      channel: 'production',
      runtimeVersion: 'unknown',
      manifest,
      rolloutPercent: 10,
    }),
  );
});

test('requires a bundle for an update and none for a rollback to the embedded one', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());
  await db
    .insert(schema.appRuntimes)
    .values({ platform: 'ios', runtimeVersion: 'fp-1', buildNumber: 11 });
  const base = { platform: 'ios', channel: 'production', runtimeVersion: 'fp-1' } as const;

  await assert.rejects(db.insert(schema.appUpdates).values({ ...base, rolloutPercent: 10 }));
  await assert.rejects(
    db
      .insert(schema.appUpdates)
      .values({ ...base, kind: 'rollback_to_embedded', manifest, rolloutPercent: 100 }),
  );
  await assert.rejects(
    db.insert(schema.appUpdates).values({ ...base, manifest, rolloutPercent: 101 }),
  );
});
