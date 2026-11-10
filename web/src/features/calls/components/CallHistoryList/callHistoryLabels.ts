import type { TFunction } from 'i18next';

import { dateTimeFormat } from '../../../../shared/i18n/format';
import type { CallHistoryEntry } from './groupCallHistory';

const timeFormat = dateTimeFormat({ hour: '2-digit', minute: '2-digit' });
const weekdayFormat = dateTimeFormat({ weekday: 'short' });
const dateFormat = dateTimeFormat({
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

const DAY_MS = 86_400_000;

/** Time for today, weekday within the last week, short date beyond that. */
export function formatCallDate(value: string, locale: string, now = new Date()): string {
  const date = new Date(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (date.getTime() >= today) return timeFormat(locale).format(date);
  if (date.getTime() >= today - 6 * DAY_MS) return weekdayFormat(locale).format(date);
  return dateFormat(locale).format(date);
}

function formatCallLength(answeredAt: string, endedAt: string, t: TFunction<'calls'>): string {
  const seconds = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(answeredAt)) / 1000));
  if (seconds < 60) return t(($) => $.length.seconds, { value: seconds });

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t(($) => $.length.minutes, { value: minutes });

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0
    ? t(($) => $.length.hoursMinutes, { hours, minutes: rest })
    : t(($) => $.length.hours, { value: hours });
}

export function callEntryStatus(
  { latest, count, outgoing }: CallHistoryEntry,
  t: TFunction<'calls'>,
): string {
  if (latest.status === 'ringing' || latest.status === 'active') return t(($) => $.inProgress);
  if (latest.status === 'declined') return t(($) => $.status.declined);
  if (latest.status === 'missed')
    return outgoing ? t(($) => $.status.noAnswer) : t(($) => $.status.missed);

  const direction = outgoing ? t(($) => $.status.outgoing) : t(($) => $.status.incoming);
  if (count > 1 || !latest.answeredAt || !latest.endedAt) return direction;
  const length = formatCallLength(latest.answeredAt, latest.endedAt, t);
  return t(($) => $.status.withLength, { direction, length });
}
