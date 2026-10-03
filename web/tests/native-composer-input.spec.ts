import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createComposerSessionId,
  readComposerMessage,
} from '../src/features/social/messaging/components/MessageComposer/native-input';

test('LAN HTTP works without crypto.randomUUID, and missing crypto has a unique fallback', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: (values: Uint32Array) => {
          values.set([1, 2, 3, 4]);
          return values;
        },
      },
    });
    assert.match(createComposerSessionId(), /^composer-/);
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    assert.notEqual(createComposerSessionId(), createComposerSessionId());
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});

test('inserts and acknowledgements from retired composers or requests are ignored', () => {
  const message = { type: 'composer/insert', sessionId: 'old-channel', requestId: 1, text: '🙂' };
  assert.equal(readComposerMessage(message, 'new-channel', 1), null);
  assert.equal(readComposerMessage(message, 'old-channel', 2), null);
  assert.equal(readComposerMessage(message, 'old-channel', 1), message);
});

test('malformed native events never reach editor operations', () => {
  assert.equal(readComposerMessage(null, 'a', 1), null);
  assert.equal(
    readComposerMessage(
      { type: 'composer/state', sessionId: 'a', requestId: 1, mode: 'unknown', tab: 'emoji' },
      'a',
      1,
    ),
    null,
  );
  assert.equal(
    readComposerMessage({ type: 'composer/insert', sessionId: 'a', requestId: 1, text: 4 }, 'a', 1),
    null,
  );
});
