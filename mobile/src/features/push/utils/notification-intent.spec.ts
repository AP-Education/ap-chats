import assert from 'node:assert/strict';
import { test } from 'node:test';

import { notificationIntent } from './notification-intent';

const channelId = '5824eb71-b12c-4f48-a30d-e15797b7116b';
const workspaceId = '630bba71-6807-445a-9dbe-aad85a050c09';
test('native push navigation accepts only a matching internal conversation route', () => {
  const intent = {
    eventId: 'event',
    userId: 'user',
    channelId,
    workspaceId,
    url: `/direct/${channelId}?pushWorkspace=${workspaceId}`,
  };
  assert.ok(notificationIntent(intent));
  assert.equal(notificationIntent({ ...intent, url: 'https://attacker.test' }), null);
  assert.equal(notificationIntent({ ...intent, workspaceId: 'another' }), null);
  assert.equal(notificationIntent({ ...intent, userId: null }), null);
});
