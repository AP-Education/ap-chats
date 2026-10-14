import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isStillRinging, remainingRingMs } from './ring';

const live = {
  id: 'call-1',
  channelId: 'channel',
  startedByMemberId: 'caller',
  startedAt: '2026-10-14T10:00:00.000Z',
  answeredAt: null,
  endedAt: null,
};

test('a call rings only while the server has that very call ringing', () => {
  assert.equal(isStillRinging('call-1', { ...live, status: 'ringing' }), true);
  assert.equal(isStillRinging('call-1', { ...live, status: 'active' }), false);
  assert.equal(isStillRinging('call-2', { ...live, status: 'ringing' }), false);
  assert.equal(isStillRinging('call-1', null), false);
});

test('the ring runs out 45 seconds after the call started', () => {
  const start = Date.parse(live.startedAt);
  assert.equal(remainingRingMs(live.startedAt, start + 10_000), 35_000);
  assert.equal(remainingRingMs(live.startedAt, start + 60_000), 0);
});
