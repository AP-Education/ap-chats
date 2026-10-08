import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CallHistoryItem, DisplayItem, MessageHistoryItem } from '../../types';
import { buildTimelineDays, formatDayLabel, runAvatar } from './timeline-days.ts';

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
  return { item, delivery: undefined };
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
  return { item, delivery: undefined };
}

// Days as runs of seqs: the shape the timeline draws.
function runs(items: DisplayItem[], firstUnreadSeq: string | null = null) {
  return buildTimelineDays(items, firstUnreadSeq).map((day) =>
    day.runs.map((run) => run.entries.map((entry) => entry.display.item.seq)),
  );
}

test('consecutive messages from one author within five minutes form one run', () => {
  const days = runs([
    message('1', 'olena', '2026-10-07T09:00:00'),
    message('2', 'olena', '2026-10-07T09:02:00'),
    message('3', 'olena', '2026-10-07T09:04:00'),
    message('4', 'taras', '2026-10-07T09:05:00'),
  ]);

  assert.deepEqual(days, [[['1', '2', '3'], ['4']]]);
});

test('a long pause, another author or the unread divider starts a new run', () => {
  const days = buildTimelineDays(
    [
      message('1', 'olena', '2026-10-07T09:00:00'),
      message('2', 'olena', '2026-10-07T09:10:00'),
      message('3', 'taras', '2026-10-07T09:11:00'),
      message('4', 'olena', '2026-10-07T09:12:00'),
      message('5', 'olena', '2026-10-07T09:13:00'),
    ],
    '5',
  );

  assert.deepEqual(
    days[0]!.runs.map((run) => [
      run.entries.map((entry) => entry.display.item.seq),
      run.unreadBefore,
    ]),
    [
      [['1'], false],
      [['2'], false],
      [['3'], false],
      [['4'], false],
      [['5'], true],
    ],
  );
});

test('a call joins the run of whoever placed it', () => {
  const [day] = buildTimelineDays(
    [
      message('1', 'olena', '2026-10-07T09:00:00'),
      call('2', '2026-10-07T09:01:00'),
      message('3', 'olena', '2026-10-07T09:02:00'),
    ],
    null,
  );

  assert.deepEqual(
    day!.runs.map((run) => [
      run.author.memberId,
      run.entries.map((entry) => entry.display.item.seq),
    ]),
    [['olena', ['1', '2', '3']]],
  );
});

test('runs never cross midnight', () => {
  const days = runs([
    message('1', 'olena', '2026-10-06T23:59:00'),
    message('2', 'olena', '2026-10-07T00:01:00'),
  ]);

  assert.deepEqual(days, [[['1']], [['2']]]);
});

test('an unsent message from an earlier day stays in the latest day instead of reopening its own', () => {
  const failed: DisplayItem = {
    ...message('0', 'me', '2026-10-06T09:00:00'),
    delivery: 'failed',
  };
  const days = buildTimelineDays(
    [
      message('1', 'olena', '2026-10-06T10:00:00'),
      message('2', 'olena', '2026-10-08T10:00:00'),
      failed,
    ],
    null,
  );

  assert.deepEqual(
    days.map((day) => day.runs.map((run) => run.entries.map((entry) => entry.display.item.seq))),
    [[['1']], [['2'], ['0']]],
  );
  assert.equal(new Set(days.map((day) => day.key)).size, days.length);
});

test('only incoming runs show an avatar', () => {
  const [day] = buildTimelineDays(
    [message('1', 'olena', '2026-10-07T09:00:00'), message('2', 'me', '2026-10-07T09:20:00')],
    null,
  );

  assert.equal(runAvatar(day!.runs[0]!, 'me')?.memberId, 'olena');
  assert.equal(runAvatar(day!.runs[1]!, 'me'), null);
});

test('day labels read as today, yesterday, or a date with the year only when it differs', () => {
  const now = new Date('2026-10-07T12:00:00');

  assert.equal(formatDayLabel(new Date('2026-10-07T08:00:00'), now), 'Сьогодні');
  assert.equal(formatDayLabel(new Date('2026-10-06T23:00:00'), now), 'Вчора');
  assert.equal(formatDayLabel(new Date('2026-09-14T10:00:00'), now), '14 вересня');
  assert.equal(formatDayLabel(new Date('2025-12-31T10:00:00'), now), '31 грудня 2025 р.');
});
