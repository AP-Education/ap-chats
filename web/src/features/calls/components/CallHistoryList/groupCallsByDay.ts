import type { CallHistoryItem } from '../../api/calls-api';

export interface CallHistoryGroup {
  key: string;
  label: string;
  items: CallHistoryItem[];
}

const dayFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' });
const dayFormatWithYear = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date, now: Date): string {
  if (dayKey(date) === dayKey(now)) return 'Сьогодні';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return 'Учора';
  return date.getFullYear() === now.getFullYear()
    ? dayFormat.format(date)
    : dayFormatWithYear.format(date);
}

/** Assumes `items` already arrive newest-first, same order the calls list renders in. */
export function groupCallsByDay(items: CallHistoryItem[]): CallHistoryGroup[] {
  const now = new Date();
  const groups: CallHistoryGroup[] = [];
  for (const item of items) {
    const date = new Date(item.startedAt);
    const key = dayKey(date);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(date, now), items: [item] });
  }
  return groups;
}
