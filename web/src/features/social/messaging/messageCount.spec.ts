import assert from 'node:assert/strict';
import { test } from 'node:test';

import { messageCount } from './messageCount.ts';

test('counts messages with the Ukrainian plural', () => {
  assert.equal(messageCount(1), '1 повідомлення');
  assert.equal(messageCount(3), '3 повідомлення');
  assert.equal(messageCount(5), '5 повідомлень');
  assert.equal(messageCount(12), '12 повідомлень');
  assert.equal(messageCount(22), '22 повідомлення');
});
