import assert from 'node:assert/strict';
import { test } from 'node:test';

import { notificationIntent } from './notification-intent';

test('a tap carries its event, owner and target, and nothing else', () => {
  const data = { eventId: 'event', userId: 'user', target: { type: 'conversation' }, extra: 1 };

  assert.deepEqual(notificationIntent(data), {
    eventId: 'event',
    userId: 'user',
    target: { type: 'conversation' },
  });
  assert.equal(notificationIntent({ ...data, userId: null }), null);
  assert.equal(notificationIntent({ ...data, target: '/channels/x' }), null);
});
