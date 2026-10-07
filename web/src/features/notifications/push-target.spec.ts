import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pushTarget } from './push-target';

const origin = 'https://connect.test';
const route =
  '/channels/5824eb71-b12c-4f48-a30d-e15797b7116b?pushWorkspace=630bba71-6807-445a-9dbe-aad85a050c09';

Object.assign(globalThis, { window: { location: { origin } } });

test('a notification opens one conversation of this app, absolute or relative', () => {
  assert.equal(pushTarget(route), route);
  assert.equal(pushTarget(`${origin}${route}&pushUser=reader`), `${route}&pushUser=reader`);
});

test('anything else a notification carries is refused', () => {
  for (const url of [
    'https://attacker.test/',
    '//attacker.test/',
    '/auth/callback',
    route.replace(/pushWorkspace=.*/u, 'pushWorkspace=another-workspace'),
    route.split('?')[0],
    42,
  ]) {
    assert.equal(pushTarget(url), null, String(url));
  }
});
