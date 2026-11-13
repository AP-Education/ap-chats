import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Message } from '@/features/social/messaging/types';

import { starMeMessageBlocks } from './message-blocks';

test('old private answers are projected as one StarMe block without changing the stored message', () => {
  const message = {
    privateToMe: true,
    assistantAnswer: true,
    replyToMessageId: 'question',
    blocks: [],
  } as unknown as Message;
  assert.deepEqual(starMeMessageBlocks(message), [{ type: 'star-me', questionId: 'question' }]);
  assert.deepEqual(message.blocks, []);
});

test('an explicit block is preserved once and publication removes its private presentation', () => {
  const block = { type: 'star-me' as const, questionId: 'question' };
  const message = {
    privateToMe: true,
    assistantAnswer: true,
    blocks: [block],
  } as unknown as Message;
  assert.equal(starMeMessageBlocks(message), message.blocks);
  assert.deepEqual(
    starMeMessageBlocks({ ...message, privateToMe: false, assistantAnswer: false }),
    [],
  );
  assert.deepEqual(starMeMessageBlocks({ ...message, assistantAnswer: false }), []);
});
