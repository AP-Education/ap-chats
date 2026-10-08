import type { CallHistoryItem } from '../../api/calls-api';

export interface CallHistoryEntry {
  key: string;
  latest: CallHistoryItem;
  count: number;
  outgoing: boolean;
}

function isOutgoing(item: CallHistoryItem): boolean {
  return item.startedByMemberId !== item.participant.memberId;
}

function localDay(value: string): string {
  return new Date(value).toDateString();
}

function canJoin(entry: CallHistoryEntry, item: CallHistoryItem): boolean {
  const { latest } = entry;
  return (
    latest.channelId === item.channelId &&
    latest.status === item.status &&
    entry.outgoing === isOutgoing(item) &&
    localDay(latest.startedAt) === localDay(item.startedAt)
  );
}

/** Collapses back-to-back calls with the same person, direction, outcome and day into one
 * row, the way Telegram shows "Name (2)". Assumes `items` arrive newest-first. */
export function groupCallHistory(items: CallHistoryItem[]): CallHistoryEntry[] {
  const entries: CallHistoryEntry[] = [];

  for (const item of items) {
    const last = entries.at(-1);
    if (last && canJoin(last, item)) {
      last.count += 1;
      continue;
    }
    entries.push({ key: item.id, latest: item, count: 1, outgoing: isOutgoing(item) });
  }

  return entries;
}
