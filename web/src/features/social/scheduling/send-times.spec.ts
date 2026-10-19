import assert from 'node:assert/strict';
import { test } from 'node:test';

import { i18n, i18nReady } from '../../../shared/i18n/i18n';
import {
  atTimeOfDay,
  defaultSendTime,
  isSendDayOpen,
  isSendTimeAllowed,
  sendTimeLabel,
  sendTimeOptions,
  timeOfDay,
} from './send-times';

// Wednesday, 14 October 2026, 15:30 in the viewer's own zone.
const wednesday = new Date(2026, 9, 14, 15, 30, 45);

await i18nReady('uk');
const t = i18n.getFixedT('uk', 'scheduling');

const labels = (now: Date) => sendTimeOptions(now, t).map(({ label }) => label);

test('quick picks are all ahead, and none of them is the same moment twice', () => {
  const options = sendTimeOptions(wednesday, t);

  assert.deepEqual(labels(wednesday), [
    'Через годину',
    'Сьогодні о 18:00',
    'Завтра о 09:00',
    'У понеділок о 09:00',
  ]);
  assert.deepEqual(options[0]!.sendAt, new Date(2026, 9, 14, 16, 30));
  assert.deepEqual(options[3]!.sendAt, new Date(2026, 9, 19, 9, 0));

  assert.ok(!labels(new Date(2026, 9, 14, 17, 30)).includes('Сьогодні о 18:00'));
  assert.ok(!labels(new Date(2026, 9, 18, 12, 0)).includes('У понеділок о 09:00'), 'Sunday');
  assert.deepEqual(
    sendTimeOptions(new Date(2026, 9, 19, 10, 0), t).at(-1)!.sendAt,
    new Date(2026, 9, 26, 9),
  );
});

test('a send time reads by its day: today, tomorrow, a date, a date in another year', () => {
  assert.equal(sendTimeLabel(new Date(2026, 9, 14, 18, 0), wednesday, t, 'uk'), 'сьогодні о 18:00');
  assert.equal(sendTimeLabel(new Date(2026, 9, 15, 9, 0), wednesday, t, 'uk'), 'завтра о 09:00');
  assert.equal(sendTimeLabel(new Date(2026, 9, 20, 9, 5), wednesday, t, 'uk'), '20 жовтня о 09:05');
  assert.match(
    sendTimeLabel(new Date(2027, 0, 2, 9, 0), wednesday, t, 'uk'),
    /^2 січня 2027.* о 09:00$/,
  );
});

test('the server takes a time ahead of now and within a year', () => {
  assert.ok(isSendTimeAllowed(new Date(2026, 9, 14, 15, 31), wednesday));
  assert.ok(!isSendTimeAllowed(new Date(2026, 9, 14, 15, 0), wednesday));
  assert.ok(!isSendTimeAllowed(new Date(2027, 9, 15, 15, 30), wednesday));
});

test('the picker starts five minutes ahead, on the minute', () => {
  assert.deepEqual(defaultSendTime(wednesday), new Date(2026, 9, 14, 15, 35));
  assert.ok(isSendTimeAllowed(defaultSendTime(wednesday), wednesday));
});

test('a day is open from today through the last day of the year ahead', () => {
  assert.ok(isSendDayOpen(new Date(2026, 9, 14), wednesday), 'today, later on');
  assert.ok(isSendDayOpen(new Date(2027, 9, 14), wednesday), 'the same date next year');
  assert.ok(!isSendDayOpen(new Date(2026, 9, 13), wednesday));
  assert.ok(!isSendDayOpen(new Date(2027, 9, 15), wednesday));
});

test('a picked day and a typed time read back as the same local minute', () => {
  const sendAt = new Date(2026, 9, 20, 9, 5);

  assert.equal(timeOfDay(sendAt), '09:05');
  assert.deepEqual(atTimeOfDay(new Date(2026, 9, 20, 23, 59), '09:05'), sendAt);
  assert.equal(atTimeOfDay(sendAt, ''), null);
});
