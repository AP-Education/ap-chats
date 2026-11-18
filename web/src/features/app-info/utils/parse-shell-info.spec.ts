import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseShellInfo } from './parse-shell-info.ts';

test('reads the shell info a phone sends', () => {
  const payload = {
    appVersion: '1.4.0',
    buildNumber: '42',
    channel: 'preview',
    runtimeVersion: 'abc123',
    updateId: '0c2f6e1a-6b8f-4c55-9a51-2f9e2b1d7c11',
    updateCreatedAt: '2026-11-18T10:00:00.000Z',
  };
  assert.deepEqual(parseShellInfo({ type: 'shell/info', payload }), payload);
});

test('turns missing, empty and odd fields into null', () => {
  const info = parseShellInfo({
    type: 'shell/info',
    payload: { appVersion: '1.4.0', buildNumber: 42, channel: '', updateId: 'x'.repeat(201) },
  });
  assert.deepEqual(info, {
    appVersion: '1.4.0',
    buildNumber: null,
    channel: null,
    runtimeVersion: null,
    updateId: null,
    updateCreatedAt: null,
  });
});

test('ignores other messages', () => {
  assert.equal(parseShellInfo({ type: 'notifications/permission', status: 'granted' }), null);
  assert.equal(parseShellInfo({ type: 'shell/info' }), null);
  assert.equal(parseShellInfo(null), null);
});
