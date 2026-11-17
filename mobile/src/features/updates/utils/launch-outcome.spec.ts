import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LAUNCH_SETTLE_MS, launchOutcome, PAGE_START_LIMIT_MS } from './launch-outcome';

test('waits until the launch has settled', () => {
  assert.equal(launchOutcome({ elapsedMs: 0, page: 'none', pageLoaded: true }), null);
});

test('counts a settled launch whose page loaded, or that has no page', () => {
  const elapsedMs = LAUNCH_SETTLE_MS;
  assert.equal(launchOutcome({ elapsedMs, page: 'reporting', pageLoaded: true }), true);
  assert.equal(launchOutcome({ elapsedMs, page: 'none', pageLoaded: false }), true);
});

test('gives a loading page until the limit, then counts the launch as failed', () => {
  assert.equal(
    launchOutcome({ elapsedMs: LAUNCH_SETTLE_MS, page: 'silent', pageLoaded: false }),
    null,
  );
  assert.equal(
    launchOutcome({ elapsedMs: PAGE_START_LIMIT_MS, page: 'silent', pageLoaded: false }),
    false,
  );
});
