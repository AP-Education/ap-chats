import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { MessageHistoryItem } from '../../types';
import { bubbleLayout, jumboEmojiCount } from './bubbleLayout.ts';

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

test('reactions take the time onto their row unless it sits on large emoji or a photo', () => {
  const message = (markdown: string, reactions = [{ emoji: '👍', count: 1, reacted: false }]) =>
    ({ message: { markdown, attachments: [] }, reactions }) as unknown as MessageHistoryItem;

  assert.equal(bubbleLayout(message('Готово'), undefined, false).meta, 'reactions');
  assert.equal(bubbleLayout(message('Готово', []), undefined, false).meta, 'inline');
  assert.deepEqual(pick(bubbleLayout(message('🔥'), undefined, false)), ['emoji', true]);
  assert.deepEqual(pick(bubbleLayout(message('Готово'), undefined, true)), [null, false]);
});

function pick(layout: ReturnType<typeof bubbleLayout>) {
  return [layout.meta, layout.reactions];
}
