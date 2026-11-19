import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OutboxEntry } from '../types';
import { sendingInFlight } from './sending-in-flight.ts';

function entry(status: OutboxEntry['status']): OutboxEntry {
  return {
    input: { markdown: 'hi', clientNonce: 'n1' },
    createdAt: '2026-11-17T10:00:00Z',
    status,
  };
}

test('is busy while a message is uploading or sending', () => {
  assert.equal(sendingInFlight([entry('uploading')], []), true);
  assert.equal(sendingInFlight([entry('sending')], []), true);
});

test('is busy while a composer file goes up', () => {
  for (const status of ['queued', 'uploading', 'processing'] as const)
    assert.equal(sendingInFlight([], [{ status }]), true);
});

test('is idle with only failed messages and files that are up or failed', () => {
  assert.equal(
    sendingInFlight([entry('failed')], [{ status: 'ready' }, { status: 'error' }]),
    false,
  );
  assert.equal(sendingInFlight([], []), false);
});
