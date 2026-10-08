import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CallHistoryItem, CallStatus } from '../../api/calls-api';
import { callEntryStatus, formatCallDate } from './callHistoryLabels';
import { groupCallHistory } from './groupCallHistory';

const me = 'member-me';

function call(
  id: string,
  startedAt: string,
  overrides: { channelId?: string; status?: CallStatus; outgoing?: boolean; endedAt?: string } = {},
): CallHistoryItem {
  const peer = `peer-${overrides.channelId ?? 'a'}`;
  return {
    id,
    channelId: overrides.channelId ?? 'a',
    status: overrides.status ?? 'ended',
    startedByMemberId: overrides.outgoing === false ? peer : me,
    startedAt,
    endedAt: overrides.endedAt ?? null,
    participant: { memberId: peer, displayName: 'Peer', avatarPath: null, active: true },
  };
}

test('back-to-back calls with the same person, outcome and day collapse into one row', () => {
  const entries = groupCallHistory([
    call('3', '2026-10-08T12:00:00'),
    call('2', '2026-10-08T11:00:00'),
    call('1', '2026-10-08T10:00:00', { channelId: 'b' }),
  ]);

  assert.deepEqual(
    entries.map((entry) => [entry.key, entry.count]),
    [
      ['3', 2],
      ['1', 1],
    ],
  );
});

test('a different direction, outcome or day starts a new row', () => {
  const entries = groupCallHistory([
    call('4', '2026-10-08T12:00:00'),
    call('3', '2026-10-08T11:00:00', { outgoing: false }),
    call('2', '2026-10-08T10:00:00', { outgoing: false, status: 'missed' }),
    call('1', '2026-10-07T10:00:00', { outgoing: false, status: 'missed' }),
  ]);

  assert.equal(entries.length, 4);
});

test('call dates read as time today, weekday this week, short date before that', () => {
  const now = new Date('2026-10-08T15:00:00');

  assert.match(formatCallDate('2026-10-08T09:05:00', now), /^09:05$/);
  assert.doesNotMatch(formatCallDate('2026-10-03T09:05:00', now), /\d/);
  assert.match(formatCallDate('2026-10-01T09:05:00', now), /^01\.10\.26$/);
});

test('a single finished call shows its length, a collapsed row only its direction', () => {
  const single = groupCallHistory([
    call('1', '2026-10-08T10:00:00', { endedAt: '2026-10-08T10:49:30' }),
  ]);
  const collapsed = groupCallHistory([
    call('2', '2026-10-08T11:00:00', { outgoing: false }),
    call('1', '2026-10-08T10:00:00', { outgoing: false }),
  ]);
  const missed = groupCallHistory([
    call('1', '2026-10-08T10:00:00', { outgoing: false, status: 'missed' }),
  ]);

  assert.equal(callEntryStatus(single[0]), 'Вихідний (49 хв)');
  assert.equal(callEntryStatus(collapsed[0]), 'Вхідний');
  assert.equal(callEntryStatus(missed[0]), 'Пропущений');
});
