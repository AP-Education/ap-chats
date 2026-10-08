import type { DisplayItem, HistoryItem, MessageAuthor } from '../../types';
import { isMessageItem } from '../../types';

export interface TimelineEntry {
  key: string;
  display: DisplayItem;
}

/** Consecutive items from one author, drawn together: one avatar, joined bubbles. */
export interface TimelineRun {
  key: string;
  /** Who wrote the messages or placed the calls in it. */
  author: MessageAuthor;
  unreadBefore: boolean;
  entries: TimelineEntry[];
}

export interface TimelineDay {
  key: string;
  date: Date;
  runs: TimelineRun[];
}

const RUN_WINDOW_MS = 5 * 60_000;

// Splits the history into calendar days, and each day into author runs.
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
    // Unsent messages stay at the bottom, in the latest day, however old their draft
    // time is; reopening an earlier day would also repeat its section key.
    const joinsLatest = display.delivery !== undefined && day !== undefined && date < day.date;
    if (!day || (day.key !== dayKey && !joinsLatest)) {
      day = { key: dayKey, date, runs: [] };
      days.push(day);
    }

    const entry = { key: entryKey(display), display };
    const run = day.runs.at(-1);
    const unreadBefore = item.seq === firstUnreadSeq;
    const previous = run?.entries.at(-1)?.display.item;
    if (run && previous && !unreadBefore && continuesRun(previous, item)) {
      run.entries.push(entry);
      continue;
    }

    day.runs.push({ key: entry.key, author: authorOf(item), unreadBefore, entries: [entry] });
  }

  return days;
}

/** Incoming runs show their author's face; the viewer's own runs need none. */
export function runAvatar(
  run: TimelineRun,
  viewerMemberId: string | undefined,
): MessageAuthor | null {
  if (run.author.memberId === viewerMemberId) return null;
  return run.author;
}

// A call belongs to whoever placed it, the same way a message belongs to its writer.
function authorOf(item: HistoryItem): MessageAuthor {
  if (isMessageItem(item)) return item.author;
  return item.startedBy;
}

function continuesRun(previous: HistoryItem, item: HistoryItem) {
  const sameAuthor = authorOf(previous).memberId === authorOf(item).memberId;
  const gap = Date.parse(item.createdAt) - Date.parse(previous.createdAt);
  return sameAuthor && gap < RUN_WINDOW_MS;
}

// Own messages keep their nonce as the key, so an unsent row turns into the sent
// message in place.
function entryKey({ item }: DisplayItem) {
  if (!isMessageItem(item)) return item.id;
  return item.message.clientNonce ?? item.id;
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
