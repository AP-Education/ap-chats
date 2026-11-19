import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CHECK_INTERVAL_MS, isCheckDue, needsPromptReload } from './update-check';

test('checks at once, then no more often than the interval', () => {
  assert.equal(isCheckDue(null, 0), true);
  assert.equal(isCheckDue(1000, 1000 + CHECK_INTERVAL_MS - 1), false);
  assert.equal(isCheckDue(1000, 1000 + CHECK_INTERVAL_MS), true);
});

test('leaves an ordinary update for the next cold start', () => {
  const manifest = { id: 'u1', extra: { mandatory: false } };
  assert.equal(needsPromptReload({ isNew: true, isRollBackToEmbedded: false, manifest }), false);
  assert.equal(
    needsPromptReload({ isNew: true, isRollBackToEmbedded: false, manifest: {} }),
    false,
  );
});

test('applies a mandatory update and a rollback promptly', () => {
  const manifest = { id: 'u1', extra: { mandatory: true } };
  assert.equal(needsPromptReload({ isNew: true, isRollBackToEmbedded: false, manifest }), true);
  assert.equal(needsPromptReload({ isNew: false, isRollBackToEmbedded: true }), true);
});

test('does nothing when no update came', () => {
  assert.equal(needsPromptReload({ isNew: false, isRollBackToEmbedded: false }), false);
});
