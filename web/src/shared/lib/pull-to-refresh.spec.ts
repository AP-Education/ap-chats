import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PULL_TRIGGER, pullIntent, pullOffset } from './pull-to-refresh';

test('the list follows the finger with growing resistance and never past its limit', () => {
  assert.equal(pullOffset(-20), 0);
  assert.ok(pullOffset(40) < 40);
  assert.ok(pullOffset(200) > pullOffset(100));
  assert.ok(pullOffset(10_000) < 132);
});

test('a comfortable pull reaches the trigger', () => {
  assert.ok(pullOffset(180) >= PULL_TRIGGER);
  assert.ok(pullOffset(100) < PULL_TRIGGER);
});

test('only a downward move commits to pulling', () => {
  assert.equal(pullIntent(2, 3), 'undecided');
  assert.equal(pullIntent(1, 12), 'pull');
  assert.equal(pullIntent(14, 10), 'ignore', 'a sideways swipe belongs to the drawers');
  assert.equal(pullIntent(0, -12), 'ignore', 'scrolling up belongs to the list');
});
