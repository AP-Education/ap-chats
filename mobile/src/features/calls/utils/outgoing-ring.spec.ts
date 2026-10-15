import assert from 'node:assert/strict';
import { test } from 'node:test';

import { outgoingRing, ringDeadline } from './outgoing-ring';

test('a call rings back only while the server still has it ringing', () => {
  assert.equal(
    outgoingRing('call-1', { id: 'call-1', status: 'ringing', answeredAt: null }),
    'ringing',
  );
  assert.equal(
    outgoingRing('call-1', {
      id: 'call-1',
      status: 'active',
      answeredAt: '2026-10-14T10:00:05.000Z',
    }),
    'answered',
  );
});

test('a call the server no longer has is over: missed, declined or hung up', () => {
  assert.equal(outgoingRing('call-1', null), 'over');
  assert.equal(
    outgoingRing('call-1', { id: 'call-2', status: 'ringing', answeredAt: null }),
    'over',
  );
});

test('the ring runs out 45 seconds after the call started', () => {
  assert.equal(ringDeadline('2026-10-14T10:00:00.000Z'), Date.parse('2026-10-14T10:00:45.000Z'));
});
