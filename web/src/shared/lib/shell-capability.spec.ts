import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shellCapability } from './shell-capability.ts';

const shell =
  'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 ApAppMobile/1 ApAppTabBar/1 ApAppReloadGuard/2';

test('reads the version of a capability the shell announces', () => {
  assert.equal(shellCapability('ReloadGuard', shell), 2);
  assert.equal(shellCapability('Mobile', shell), 1);
});

test('reads 0 for a capability the shell lacks or only resembles', () => {
  assert.equal(shellCapability('Reload', shell), 0);
  assert.equal(shellCapability('ReloadGuard', 'Mozilla/5.0 (iPhone) ApAppMobile/1'), 0);
  assert.equal(shellCapability('Mobile', 'Mozilla/5.0 Chrome/130'), 0);
});
