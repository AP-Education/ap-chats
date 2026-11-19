import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { type OfferedUpdate, rolloutBucket, selectUpdate } from './select-update';

const update = (rolloutPercent: number, kind: OfferedUpdate['kind'] = 'update'): OfferedUpdate => ({
  id: randomUUID(),
  kind,
  rolloutPercent,
});

test('places an installation in the same bucket every time', () => {
  const updateId = randomUUID();
  assert.equal(rolloutBucket('phone-1', updateId), rolloutBucket('phone-1', updateId));
});

test('keeps buckets within 0..99 and spreads installations across them', () => {
  const updateId = randomUUID();
  const buckets = Array.from({ length: 2000 }, (_, i) => rolloutBucket(`phone-${i}`, updateId));
  assert.ok(buckets.every((bucket) => bucket >= 0 && bucket < 100));
  const inTenPercent = buckets.filter((bucket) => bucket < 10).length;
  assert.ok(inTenPercent > 120 && inTenPercent < 280, `${inTenPercent} of 2000 in 10%`);
});

test('offers the newest update once it reaches everyone', () => {
  const newest = update(100);
  assert.equal(selectUpdate([newest, update(100)], 'phone-1'), newest);
});

test('offers nobody an update at 0%', () => {
  assert.equal(selectUpdate([update(0)], 'phone-1'), null);
});

test('falls back to an older update for installations outside the newest rollout', () => {
  const partial = update(10);
  const previous = update(100);
  const ids = Array.from({ length: 200 }, (_, i) => `phone-${i}`);
  const outside = ids.find((id) => rolloutBucket(id, partial.id) >= 10)!;
  const inside = ids.find((id) => rolloutBucket(id, partial.id) < 10)!;

  assert.equal(selectUpdate([partial, previous], outside), previous);
  assert.equal(selectUpdate([partial, previous], inside), partial);
});

test('offers an anonymous installation only what has reached everyone', () => {
  const partial = update(50);
  const full = update(100);
  assert.equal(selectUpdate([partial, full], null), full);
  assert.equal(selectUpdate([partial], null), null);
});

test('returns a rollback to the embedded bundle like any other update', () => {
  const rollback = update(100, 'rollback_to_embedded');
  assert.equal(selectUpdate([rollback, update(100)], 'phone-1'), rollback);
});

test('returns nothing when no update is offered', () => {
  assert.equal(selectUpdate([], 'phone-1'), null);
});
