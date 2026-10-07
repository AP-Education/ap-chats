import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CallHistoryItem, DisplayItem, MessageHistoryItem } from '../../types';
import { buildTimelineDays, formatDayLabel } from './timeline-days.ts';

function message(seq: string, author: string, createdAt: string): DisplayItem {
  const item: MessageHistoryItem = {
    type: 'MESSAGE',
    id: `message-${seq}`,
    seq,
    createdAt,
    message: {
      id: `message-${seq}`,
      seq,
      authorMemberId: author,
      clientNonce: null,
      markdown: seq,
      contentVersion: 1,
      revision: 1,
      replyToMessageId: null,
      quoteText: null,
      isForwarded: false,
      forwardedFromMemberId: null,
      createdAt,
      editedAt: null,
      deletedAt: null,
    },
    author: { memberId: author, displayName: author, avatarPath: null },
    reply: null,
    forwardedFrom: null,
    pin: null,
  };
  return { item, delivery: undefined, nonce: null };
}

function call(seq: string, createdAt: string): DisplayItem {
  const item: CallHistoryItem = {
    type: 'CALL',
    id: `call-${seq}`,
    seq,
    createdAt,
    call: {
      id: `call-${seq}`,
      status: 'ended',
      startedByMemberId: 'olena',
      startedAt: createdAt,
      endedAt: createdAt,
    },
    startedBy: { memberId: 'olena', displayName: 'Olena', avatarPath: null },
  };
  return { item, delivery: undefined, nonce: null };
}

function runs(items: DisplayItem[], firstUnreadSeq: string | null = null) {
  return buildTimelineDays(items, firstUnreadSeq).map((day) =>
    day.entries.map(({ display, groupStart, groupEnd }) => [
      display.item.seq,
      groupStart,
      groupEnd,
    ]),
  );
}

test('consecutive messages from one author within five minutes form one run', () => {
  const days = runs([
    message('1', 'olena', '2026-10-07T09:00:00'),
    message('2', 'olena', '2026-10-07T09:02:00'),
    message('3', 'olena', '2026-10-07T09:04:00'),
    message('4', 'taras', '2026-10-07T09:05:00'),
  ]);

  assert.deepEqual(days, [
    [
      ['1', true, false],
      ['2', false, false],
      ['3', false, true],
      ['4', true, true],
    ],
  ]);
});

test('a long pause, a call or the unread divider starts a new run', () => {
  const days = runs(
    [
      message('1', 'olena', '2026-10-07T09:00:00'),
      message('2', 'olena', '2026-10-07T09:10:00'),
      call('3', '2026-10-07T09:11:00'),
      message('4', 'olena', '2026-10-07T09:12:00'),
      message('5', 'olena', '2026-10-07T09:13:00'),
    ],
    '5',
  );

  assert.deepEqual(days, [
    [
      ['1', true, true],
      ['2', true, true],
      ['3', true, true],
      ['4', true, true],
      ['5', true, true],
    ],
  ]);
});

test('runs never cross midnight', () => {
  const days = buildTimelineDays(
    [message('1', 'olena', '2026-10-06T23:59:00'), message('2', 'olena', '2026-10-07T00:01:00')],
    null,
  );

  assert.equal(days.length, 2);
  assert.equal(days[1]!.entries[0]!.groupStart, true);
});

test('day labels read as today, yesterday, or a date with the year only when it differs', () => {
  const now = new Date('2026-10-07T12:00:00');

  assert.equal(formatDayLabel(new Date('2026-10-07T08:00:00'), now), 'Сьогодні');
  assert.equal(formatDayLabel(new Date('2026-10-06T23:00:00'), now), 'Вчора');
  assert.equal(formatDayLabel(new Date('2026-09-14T10:00:00'), now), '14 вересня');
  assert.equal(formatDayLabel(new Date('2025-12-31T10:00:00'), now), '31 грудня 2025 р.');
});
