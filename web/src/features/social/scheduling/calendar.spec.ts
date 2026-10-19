import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addMonths,
  firstWeekColumn,
  isSameDay,
  monthDays,
  monthTitle,
  weekdayLabels,
} from './calendar';

const october = new Date(2026, 9, 1);

test('a week starts on Monday', () => {
  assert.equal(weekdayLabels('uk').length, 7);
  assert.equal(weekdayLabels('uk')[0], 'пн');
  assert.equal(weekdayLabels('en')[0], 'Mon');
  assert.equal(weekdayLabels('uk')[6], 'нд');
});

test('a month lays out from the weekday its first day falls on', () => {
  assert.equal(firstWeekColumn(october), 4, '1 October 2026 is a Thursday');
  assert.equal(firstWeekColumn(new Date(2026, 10, 15)), 7, '1 November 2026 is a Sunday');
  assert.equal(firstWeekColumn(new Date(2026, 5, 1)), 1, '1 June 2026 is a Monday');
});

test('a month holds each of its days once', () => {
  assert.equal(monthDays(october).length, 31);
  assert.equal(monthDays(new Date(2028, 1, 10)).length, 29, 'a leap February');
  assert.ok(isSameDay(monthDays(october).at(-1)!, new Date(2026, 9, 31, 18, 30)));
});

test('months turn over the year and read by name', () => {
  assert.deepEqual(addMonths(new Date(2026, 11, 1), 1), new Date(2027, 0, 1));
  assert.deepEqual(addMonths(new Date(2026, 0, 31), -1), new Date(2025, 11, 1));
  assert.equal(monthTitle(october, 'uk'), 'Жовтень 2026');
});
