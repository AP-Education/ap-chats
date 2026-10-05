import assert from 'node:assert/strict';
import { test } from 'node:test';

import { useNotificationStore } from './notification-store';

test('pending notification survives WebView loading and an old acknowledgement cannot erase a newer tap', () => {
  const first = {
    eventId: 'first',
    userId: 'user',
    workspaceId: 'workspace',
    channelId: 'channel',
    url: '/channels/channel',
  };
  const second = { ...first, eventId: 'second' };
  const store = useNotificationStore.getState();
  store.open(first);
  store.setReady(false);
  assert.equal(useNotificationStore.getState().pending?.eventId, 'first');
  store.open(second);
  store.acknowledge(first.eventId);
  assert.equal(useNotificationStore.getState().pending?.eventId, 'second');
  store.acknowledge(second.eventId);
  assert.equal(useNotificationStore.getState().pending, null);
  store.open(second);
  assert.equal(useNotificationStore.getState().pending, null);
});
