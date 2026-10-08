import type { CallHistoryEntry } from './groupCallHistory';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' });
const dateFormat = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

const DAY_MS = 86_400_000;

/** Time for today, weekday within the last week, short date beyond that. */
export function formatCallDate(value: string, now = new Date()): string {
  const date = new Date(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (date.getTime() >= today) return timeFormat.format(date);
  if (date.getTime() >= today - 6 * DAY_MS) return weekdayFormat.format(date);
  return dateFormat.format(date);
}

function formatCallLength(startedAt: string, endedAt: string): string {
  const seconds = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));
  if (seconds < 60) return `${seconds} с`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} хв`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} год ${rest} хв` : `${hours} год`;
}

export function callEntryStatus({ latest, count, outgoing }: CallHistoryEntry): string {
  if (latest.status === 'ringing' || latest.status === 'active') return 'Дзвінок триває';
  if (latest.status === 'declined') return 'Відхилено';
  if (latest.status === 'missed') return outgoing ? 'Без відповіді' : 'Пропущений';

  const direction = outgoing ? 'Вихідний' : 'Вхідний';
  if (count > 1 || !latest.endedAt) return direction;
  return `${direction} (${formatCallLength(latest.startedAt, latest.endedAt)})`;
}
