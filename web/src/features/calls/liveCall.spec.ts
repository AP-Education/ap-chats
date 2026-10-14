import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CallView } from './api/calls-api';
import { liveCallAfter } from './liveCall';
import type { CallSignal } from './schemas';

const ringing: CallView = {
  id: 'call-1',
  channelId: 'channel',
  status: 'ringing',
  startedByMemberId: 'caller',
  startedAt: '2026-10-14T10:00:00.000Z',
  answeredAt: null,
  endedAt: null,
};

const signal: CallSignal = {
  workspaceId: 'workspace',
  channelId: 'channel',
  channelKind: 'dm',
  callId: 'call-1',
  roomName: 'room',
  startedByMemberId: 'callee',
  startedByDisplayName: 'Callee',
  startedByAvatarPath: null,
  status: 'ringing',
  startedAt: ringing.startedAt,
  answeredAt: null,
};

test('an answer turns the live call active, timed from the answer', () => {
  const answeredAt = '2026-10-14T10:00:07.000Z';

  const live = liveCallAfter({ ...signal, status: 'active', answeredAt }, ringing);

  assert.deepEqual(live, { ...ringing, status: 'active', answeredAt });
});

test('a call that is over leaves no live call behind', () => {
  for (const status of ['declined', 'ended', 'missed'] as const)
    assert.equal(liveCallAfter({ ...signal, status }, ringing), null);
});

test("a channel decline that stops only one person's ring keeps the call ringing", () => {
  assert.deepEqual(liveCallAfter(signal, ringing), ringing);
});

test('a signal about another call, or nothing known yet, changes nothing', () => {
  assert.deepEqual(
    liveCallAfter({ ...signal, callId: 'call-2', status: 'ended' }, ringing),
    ringing,
  );
  assert.equal(liveCallAfter(signal, undefined), undefined);
  assert.equal(liveCallAfter(signal, null), null);
});
