import type { DisplayItem, HistoryItem } from '../../types';
import { isMessageItem } from '../../types';

export interface TimelineEntry {
  key: string;
  display: DisplayItem;
  unreadBefore: boolean;
  groupStart: boolean;
  groupEnd: boolean;
}

export interface TimelineDay {
  key: string;
  date: Date;
  entries: TimelineEntry[];
}

const GROUP_WINDOW_MS = 5 * 60_000;

// Splits the history into calendar days and marks author runs inside each day, so a
// bubble knows whether it opens a run (author name) and whether it closes it (tail, avatar).
export function buildTimelineDays(
  items: DisplayItem[],
  firstUnreadSeq: string | null,
): TimelineDay[] {
  const days: TimelineDay[] = [];

  for (const display of items) {
    const { item } = display;
    const date = new Date(item.createdAt);
    const dayKey = date.toDateString();
    let day = days.at(-1);
    if (day?.key !== dayKey) {
      day = { key: dayKey, date, entries: [] };
      days.push(day);
    }

    const previous = day.entries.at(-1);
    const unreadBefore = item.seq === firstUnreadSeq;
    const continuesRun = Boolean(
      previous && !unreadBefore && continuesAuthorRun(previous.display.item, item),
    );
    if (previous && continuesRun) previous.groupEnd = false;

    day.entries.push({
      key: entryKey(display),
      display,
      unreadBefore,
      groupStart: !continuesRun,
      groupEnd: true,
    });
  }

  return days;
}

function continuesAuthorRun(previous: HistoryItem, item: HistoryItem) {
  if (!isMessageItem(previous) || !isMessageItem(item)) return false;

  const sameAuthor = previous.message.authorMemberId === item.message.authorMemberId;
  const gap = Date.parse(item.createdAt) - Date.parse(previous.createdAt);
  return sameAuthor && gap < GROUP_WINDOW_MS;
}

function entryKey({ item, nonce }: DisplayItem) {
  if (!isMessageItem(item)) return item.id;
  return nonce ?? item.message.clientNonce ?? item.id;
}

const dayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' });
const dayMonthYear = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatDayLabel(date: Date, now = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((today.getTime() - day.getTime()) / 86_400_000);

  if (daysAgo === 0) return 'Сьогодні';
  if (daysAgo === 1) return 'Вчора';
  if (date.getFullYear() === now.getFullYear()) return dayMonth.format(date);
  return dayMonthYear.format(date);
}
