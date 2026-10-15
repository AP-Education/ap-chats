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

test('a lone GIF link shows the GIF alone, without a bubble; with words the words come first', () => {
  const link = 'https://klipy.com/gifs/hello-hi-662';
  const gif = {
    type: 'gif',
    provider: 'klipy',
    link,
    title: 'Hello',
    media: { url: 'https://static.klipy.com/ii/hello.webp', width: 498, height: 498 },
  };
  const message = (markdown: string, blocks = [gif]) =>
    ({ message: { markdown, attachments: [], blocks } }) as unknown as MessageHistoryItem;
  const layout = (markdown: string, blocks?: object[]) => {
    const { variant, hasText, meta } = bubbleLayout(
      message(markdown, blocks as never),
      undefined,
      false,
    );
    return [variant, hasText, meta];
  };

  assert.deepEqual(layout(link), ['bare', false, 'overlay'], 'a lone GIF shows without a bubble');
  assert.deepEqual(layout(`привіт ${link}`), ['media', true, 'overlay']);
  assert.deepEqual(
    layout(link, []),
    ['text', true, 'inline'],
    'a link with no GIF found stays text',
  );
});

function pick(layout: ReturnType<typeof bubbleLayout>) {
  return [layout.meta, layout.reactions];
}
