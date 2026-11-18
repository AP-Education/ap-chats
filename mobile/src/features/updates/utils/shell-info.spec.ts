import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeShell, type ShellInfoInput } from './shell-info';

const base: ShellInfoInput = {
  appVersion: '1.4.0',
  buildNumber: '42',
  updatesEnabled: true,
  channel: 'preview',
  runtimeVersion: 'abc123',
  isEmbeddedLaunch: false,
  updateId: '0c2f6e1a-6b8f-4c55-9a51-2f9e2b1d7c11',
  createdAt: new Date('2026-11-18T10:00:00.000Z'),
};

test('names the update a phone runs', () => {
  assert.deepEqual(describeShell(base), {
    appVersion: '1.4.0',
    buildNumber: '42',
    channel: 'preview',
    runtimeVersion: 'abc123',
    updateId: '0c2f6e1a-6b8f-4c55-9a51-2f9e2b1d7c11',
    updateCreatedAt: '2026-11-18T10:00:00.000Z',
  });
});

test('has no update while the embedded bundle runs', () => {
  const info = describeShell({ ...base, isEmbeddedLaunch: true });
  assert.equal(info.updateId, null);
  assert.equal(info.updateCreatedAt, null);
  assert.equal(info.channel, 'preview');
});

test('keeps only the version when updates are off', () => {
  assert.deepEqual(describeShell({ ...base, updatesEnabled: false, channel: '' }), {
    appVersion: '1.4.0',
    buildNumber: '42',
    channel: null,
    runtimeVersion: null,
    updateId: null,
    updateCreatedAt: null,
  });
});
