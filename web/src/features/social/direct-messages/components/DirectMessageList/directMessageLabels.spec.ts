import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatRecentTime, lastMessagePreview } from './directMessageLabels.ts';

const now = new Date('2026-10-19T12:00:00Z');

function message(markdown: string | null) {
  return { id: 'message', markdown, authorMemberId: 'author', createdAt: now.toISOString() };
}

test('the preview says what the last message was, even when there is no text to show', () => {
  assert.equal(lastMessagePreview(null), 'Нова розмова');
  assert.equal(lastMessagePreview(message(null)), 'Повідомлення видалено');
  assert.equal(lastMessagePreview(message('')), 'Вкладення');
  assert.equal(lastMessagePreview(message('See   you\nsoon')), 'See you soon');
});

test('recent times read as minutes, hours or days ago, then as a date', () => {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  assert.equal(formatRecentTime(ago(0), now), 'щойно');
  assert.equal(formatRecentTime(ago(5), now), '5 хв');
  assert.equal(formatRecentTime(ago(3 * 60), now), '3 год');
  assert.equal(formatRecentTime(ago(2 * 1_440), now), '2 дн');
  assert.equal(formatRecentTime(ago(30 * 1_440), now), '19.09');
});
