import assert from 'node:assert/strict';
import { test } from 'node:test';

import { useNotificationStore } from './notification-store';

const tap = {
  eventId: 'first',
  userId: 'user',
  workspaceId: 'workspace',
  channelId: 'channel',
  url: '/channels/channel',
};

test('a tap stays pending through page reloads until the page routes it', () => {
  const store = useNotificationStore.getState();
  store.open(tap);
  store.setWebReady(false);
  assert.equal(useNotificationStore.getState().pending?.eventId, 'first');

  store.acknowledge('first');
  assert.equal(useNotificationStore.getState().pending, null);
});

test('a stale acknowledgement cannot drop a newer tap, and a routed tap is not reopened', () => {
  const store = useNotificationStore.getState();
  store.open({ ...tap, eventId: 'second' });
  store.acknowledge('first');
  assert.equal(useNotificationStore.getState().pending?.eventId, 'second');

  store.acknowledge('second');
  store.open({ ...tap, eventId: 'second' });
  assert.equal(useNotificationStore.getState().pending, null);
});

test('a page that stops being ready no longer counts as attending', () => {
  const store = useNotificationStore.getState();
  store.setWebReady(true);
  store.setWebAttending(true);
  store.setWebReady(false);
  assert.equal(useNotificationStore.getState().webAttending, false);
});
