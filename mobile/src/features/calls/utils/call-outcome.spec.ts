import assert from 'node:assert/strict';
import { test } from 'node:test';

import { callOutcome } from './call-outcome';

test('a ring the server no longer has is over', () => {
  assert.equal(callOutcome('ringing', 'call-1', null), 'remoteEnded');
  assert.equal(
    callOutcome('ringing', 'call-1', { id: 'call-2', status: 'ringing' }),
    'remoteEnded',
  );
});

test('a ring answered on another device ends as answered elsewhere', () => {
  assert.equal(
    callOutcome('ringing', 'call-1', { id: 'call-1', status: 'active' }),
    'answeredElsewhere',
  );
});

test('a ring or a call the server still has holds', () => {
  assert.equal(callOutcome('ringing', 'call-1', { id: 'call-1', status: 'ringing' }), null);
  assert.equal(callOutcome('connected', 'call-1', { id: 'call-1', status: 'active' }), null);
});
