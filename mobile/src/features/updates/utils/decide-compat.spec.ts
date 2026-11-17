import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decideCompat, parseBuildNumber } from './decide-compat';

const store = 'https://apps.apple.com/app/id1';
const requires = (minSupportedBuild: number | null) => ({ minSupportedBuild, storeUrl: store });

test('sends a build below the minimum to the store', () => {
  assert.deepEqual(decideCompat(10, requires(11), null), {
    kind: 'update-required',
    storeUrl: store,
  });
});

test('keeps a build at or above the minimum running', () => {
  assert.deepEqual(decideCompat(11, requires(11), null), { kind: 'ok' });
  assert.deepEqual(decideCompat(12, requires(11), null), { kind: 'ok' });
});

test('keeps every build running when no minimum is set', () => {
  assert.deepEqual(decideCompat(1, requires(null), null), { kind: 'ok' });
});

test('uses the remembered answer when the API cannot be reached', () => {
  assert.equal(decideCompat(10, null, requires(11)).kind, 'update-required');
});

test('prefers a fresh answer over the remembered one', () => {
  assert.equal(decideCompat(10, requires(null), requires(11)).kind, 'ok');
});

test('runs when there is no answer at all or the build is unknown', () => {
  assert.equal(decideCompat(10, null, null).kind, 'ok');
  assert.equal(decideCompat(null, requires(11), null).kind, 'ok');
});

test('reads only whole build numbers', () => {
  assert.equal(parseBuildNumber('11'), 11);
  for (const value of [null, undefined, '', '1.0.2', 'abc'])
    assert.equal(parseBuildNumber(value), null);
});
