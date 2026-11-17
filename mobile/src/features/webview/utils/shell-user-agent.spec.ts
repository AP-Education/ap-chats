import assert from 'node:assert/strict';
import { test } from 'node:test';

import { APP_SHELL_USER_AGENT, shellUserAgent } from './shell-user-agent';

test('keeps the string shells already in the stores send', () => {
  // Pages detect older shells by exactly this; changing it breaks them silently.
  assert.equal(APP_SHELL_USER_AGENT, 'ApAppMobile/1 ApAppTabBar/1');
});

test('writes one ApApp token per capability in order', () => {
  assert.equal(shellUserAgent({ Mobile: 1, ReloadGuard: 2 }), 'ApAppMobile/1 ApAppReloadGuard/2');
});
