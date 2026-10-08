import assert from 'node:assert/strict';
import { test } from 'node:test';

import { notificationRoute } from './notification-route';

const channelId = '5824eb71-b12c-4f48-a30d-e15797b7116b';
const workspaceId = '630bba71-6807-445a-9dbe-aad85a050c09';
const conversation = { type: 'conversation', workspaceId, channelId, kind: 'dm' };

test('a conversation target opens that conversation in its workspace', () => {
  assert.deepEqual(notificationRoute(conversation), { workspaceId, path: `/direct/${channelId}` });
  assert.equal(
    notificationRoute({ ...conversation, kind: 'channel' })?.path,
    `/channels/${channelId}`,
  );
});

test('unknown or malformed targets lead nowhere', () => {
  assert.equal(notificationRoute({ ...conversation, type: 'invoice' }), null);
  assert.equal(notificationRoute({ ...conversation, channelId: '../settings' }), null);
  assert.equal(notificationRoute({ ...conversation, kind: 'thread' }), null);
  assert.equal(notificationRoute('/channels/x'), null);
});
