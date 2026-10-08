import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jumboEmojiCount } from './bubbleLayout.ts';

test('one to three emoji are shown large, counted as whole emoji', () => {
  assert.equal(jumboEmojiCount('😀'), 1);
  assert.equal(jumboEmojiCount('😀😀'), 2);
  assert.equal(jumboEmojiCount(' 😀 👍🏽 🇺🇦 '), 3);
  assert.equal(jumboEmojiCount('👨‍👩‍👧‍👦'), 1);
  assert.equal(jumboEmojiCount('1️⃣'), 1);
});

test('more emoji, any text, or nothing at all stays a regular message', () => {
  assert.equal(jumboEmojiCount('😀😀😀😀'), 0);
  assert.equal(jumboEmojiCount('ok 😀'), 0);
  assert.equal(jumboEmojiCount('12'), 0);
  assert.equal(jumboEmojiCount(''), 0);
  assert.equal(jumboEmojiCount(null), 0);
});
