import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isNewSession } from './inventory-session';

const viewer = { identity: 'viewer', socketId: 'session-1' };

test('the inventory refreshes once per connection, again after a reconnect or another sign-in', () => {
  assert.equal(isNewSession(null, viewer), true);
  assert.equal(isNewSession(viewer, { ...viewer }), false);
  assert.equal(isNewSession(viewer, { ...viewer, socketId: 'session-2' }), true);
  assert.equal(isNewSession(viewer, { ...viewer, identity: 'next-viewer' }), true);
});
