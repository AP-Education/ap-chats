import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readRingEnding } from './ring-ending';

test("reads why a ring ended, in the OS call log's terms", () => {
  const push = { data: { messageType: 'ringEnded', callId: 'call-1', reason: 'answered' } };
  assert.deepEqual(readRingEnding(push), { callId: 'call-1', reason: 'answeredElsewhere' });
});

test('ignores every other push and a reason it does not know', () => {
  assert.equal(readRingEnding({ data: { messageType: 'incomingCall', callId: 'call-1' } }), null);
  assert.equal(
    readRingEnding({ data: { messageType: 'ringEnded', callId: 'call-1', reason: 'lost' } }),
    null,
  );
  assert.equal(readRingEnding(null), null);
});
