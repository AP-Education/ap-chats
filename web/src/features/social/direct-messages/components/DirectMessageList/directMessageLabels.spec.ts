import assert from 'node:assert/strict';
import { test } from 'node:test';

import { i18n, i18nReady } from '../../../../../shared/i18n/i18n';
import {
  conversationPreview,
  formatRecentTime,
  lastActivityAt,
  lastMessagePreview,
} from './directMessageLabels.ts';

const now = new Date('2026-10-19T12:00:00Z');

await i18nReady('uk');
const t = i18n.getFixedT('uk', 'directMessages');

function message(markdown: string | null) {
  return { id: 'message', markdown, authorMemberId: 'author', createdAt: now.toISOString() };
}

test('the preview says what the last message was, even when there is no text to show', () => {
  assert.equal(lastMessagePreview(null, t), 'Нова розмова');
  assert.equal(lastMessagePreview(message(null), t), 'Повідомлення видалено');
  assert.equal(lastMessagePreview(message(''), t), 'Вкладення');
  assert.equal(lastMessagePreview(message('See   you\nsoon'), t), 'See you soon');
});

test('a call that came after every message is what the preview names, from the viewer side', () => {
  const participant = { memberId: 'bob', displayName: 'Bob', avatarPath: null, active: true };
  const call = (startedByMemberId: string, status: 'ended' | 'missed') => ({
    id: 'call',
    status,
    startedByMemberId,
    startedAt: now.toISOString(),
  });

  assert.equal(
    conversationPreview({ participant, lastMessage: null, lastCall: call('bob', 'ended') }, t),
    'Вхідний дзвінок',
  );
  assert.equal(
    conversationPreview({ participant, lastMessage: null, lastCall: call('ann', 'ended') }, t),
    'Вихідний дзвінок',
  );
  assert.equal(
    conversationPreview({ participant, lastMessage: null, lastCall: call('bob', 'missed') }, t),
    'Пропущений дзвінок',
  );
  assert.equal(conversationPreview({ participant, lastMessage: message('Hi') }, t), 'Hi');
});

test('the time beside a conversation is the time of what its preview names', () => {
  const earlier = message('Hi');
  const call = {
    id: 'call',
    status: 'ended' as const,
    startedByMemberId: 'bob',
    startedAt: '2026-10-19T12:05:00Z',
  };

  assert.equal(lastActivityAt({ lastMessage: earlier, lastCall: call }), call.startedAt);
  assert.equal(lastActivityAt({ lastMessage: earlier, lastCall: null }), earlier.createdAt);
});

test('recent times read as minutes, hours or days ago, then as a date', () => {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  assert.equal(formatRecentTime(ago(0), t, 'uk', now), 'щойно');
  assert.equal(formatRecentTime(ago(5), t, 'uk', now), '5 хв');
  assert.equal(formatRecentTime(ago(3 * 60), t, 'uk', now), '3 год');
  assert.equal(formatRecentTime(ago(2 * 1_440), t, 'uk', now), '2 дн');
  assert.equal(formatRecentTime(ago(30 * 1_440), t, 'uk', now), '19.09');
});
