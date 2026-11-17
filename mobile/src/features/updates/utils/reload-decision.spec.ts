import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canReloadNow, type ReloadConditions } from './reload-decision';

const idle: ReloadConditions = {
  appActive: true,
  inCall: false,
  authInProgress: false,
  page: 'reporting',
  pageBusy: false,
};

test('reloads when the page reports nothing to lose', () => {
  assert.equal(canReloadNow(idle), true);
  assert.equal(canReloadNow({ ...idle, page: 'none' }), true);
});

test('waits out a call, a sign-in and work the page reports, even in the background', () => {
  for (const appActive of [true, false]) {
    assert.equal(canReloadNow({ ...idle, appActive, inCall: true }), false);
    assert.equal(canReloadNow({ ...idle, appActive, authInProgress: true }), false);
    assert.equal(canReloadNow({ ...idle, appActive, pageBusy: true }), false);
  }
});

test('reloads a page that cannot report only in the background', () => {
  assert.equal(canReloadNow({ ...idle, page: 'silent' }), false);
  assert.equal(canReloadNow({ ...idle, page: 'silent', appActive: false }), true);
});
