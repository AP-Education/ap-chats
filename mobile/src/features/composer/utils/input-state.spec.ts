import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyInputRequest,
  initialInputState,
  inputAreaHeight,
  isComposerInputRequest,
} from './input-state';

test('only the attached composer can control input; delayed commands cannot reopen it', () => {
  const attached = applyInputRequest(initialInputState, {
    type: 'composer/attach',
    sessionId: 'a',
  });
  const picker = applyInputRequest(attached, {
    type: 'composer/input',
    sessionId: 'a',
    requestId: 1,
    mode: 'picker',
  });
  const keyboard = applyInputRequest(picker, {
    type: 'composer/input',
    sessionId: 'a',
    requestId: 2,
    mode: 'keyboard',
  });
  assert.equal(
    applyInputRequest(keyboard, {
      type: 'composer/input',
      sessionId: 'a',
      requestId: 1,
      mode: 'picker',
    }),
    keyboard,
  );
  const another = applyInputRequest(keyboard, { type: 'composer/attach', sessionId: 'b' });
  assert.equal(applyInputRequest(another, { type: 'composer/detach', sessionId: 'a' }), another);
  assert.equal(
    applyInputRequest(another, {
      type: 'composer/input',
      sessionId: 'a',
      requestId: 3,
      mode: 'picker',
    }),
    another,
  );
});

test('keyboard and picker occupy one area throughout both handoffs, including safe area', () => {
  for (const keyboard of [346, 280, 140, 35, 0]) {
    assert.equal(inputAreaHeight('picker', keyboard, 346, 0, 34, 800), 346);
  }
  for (const keyboard of [0, 35, 140, 280, 346]) {
    assert.equal(inputAreaHeight('keyboard', keyboard, 0, 346, 34, 800), 346);
  }
  assert.equal(inputAreaHeight('keyboard', 346, 0, 0, 34, 800), 346);
  assert.equal(inputAreaHeight('closed', 0, 0, 0, 34, 800), 34);
  assert.equal(inputAreaHeight('keyboard', 0, 0, 0, 0, 800), 0);
});

test('search remains above the system keyboard and preserves space for the composer', () => {
  assert.equal(inputAreaHeight('search', 346, 346, 0, 34, 800), 640);
  assert.equal(inputAreaHeight('search', 0, 346, 0, 34, 800), 346);
  assert.equal(inputAreaHeight('search', 400, 346, 0, 34, 900), 740);
});

test('invalid bridge requests are rejected before native state changes', () => {
  for (const value of [
    null,
    {},
    { type: 'composer/attach' },
    { type: 'composer/input', sessionId: 'a', requestId: -1, mode: 'picker' },
    { type: 'composer/input', sessionId: 'a', requestId: '1', mode: 'picker' },
    { type: 'composer/input', sessionId: 'a', requestId: 1, mode: 'invalid' },
    { type: 'composer/input', sessionId: 'a', requestId: 1, mode: 'picker', tab: 'invalid' },
  ])
    assert.equal(isComposerInputRequest(value), false);
  assert.equal(
    isComposerInputRequest({
      type: 'composer/input',
      sessionId: 'a',
      requestId: 1,
      mode: 'picker',
      tab: 'emoji',
    }),
    true,
  );
});
