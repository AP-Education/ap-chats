import {
  hashKey,
  type InfiniteData,
  type QueryClient,
  replaceEqualDeep,
} from '@tanstack/react-query';

import type { PageCursor } from './hooks/useMessageHistory';
import { messagingQueryKeys } from './queryKeys';
import type { HistoryItem, HistoryPage } from './types';

type HistoryData = InfiniteData<HistoryPage, PageCursor>;

// When each conversation's opening window was last asked for, and when it was last left unwatched.
const windowRequestedAt = new Map<string, number>();
const unwatchedAt = new Map<string, number>();

export function noteWindowRequested(key: readonly unknown[]) {
  windowRequestedAt.set(hashKey(key), Date.now());
}

/** Events stop reaching a conversation that is left, so from here on its cache may fall behind. */
export function noteUnwatched(key: readonly unknown[]) {
  unwatchedAt.set(hashKey(key), Date.now());
}

export function mergeHistoryItem(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
  item: HistoryItem,
) {
  queryClient.setQueriesData<HistoryData>(
    { queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId) },
    (current) => {
      if (!current?.pages.length) return current;
      const pages = current.pages.map((page) => ({ ...page, items: [...page.items] }));
      const existingPage = pages.find((page) => page.items.some((entry) => entry.id === item.id));
      if (existingPage) {
        existingPage.items = existingPage.items.map((entry) =>
          entry.id === item.id ? item : entry,
        );
      } else {
        const tail = pages.at(-1)!;
        if (tail.hasNewer) return current;
        const cursor = tail.items.at(-1)?.seq ?? tail.snapshotSeq;
        if (BigInt(item.seq) > BigInt(cursor) + 1n) return current;
        tail.items.push(item);
        tail.items.sort((left, right) =>
          BigInt(left.seq) < BigInt(right.seq) ? -1 : BigInt(left.seq) > BigInt(right.seq) ? 1 : 0,
        );
      }
      const tail = pages.at(-1)!;
      if (BigInt(item.seq) > BigInt(tail.snapshotSeq)) tail.snapshotSeq = item.seq;
      return { ...current, pages };
    },
  );
}

export async function catchUpHistory(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
  key: readonly unknown[],
  targetSeq: string,
  fetchAfter: (cursor: string) => Promise<HistoryPage>,
  forceRange = false,
) {
  let data = queryClient.getQueryData<HistoryData>(key);
  let tail = data?.pages.at(-1);
  if (!tail || tail.hasNewer) return;
  let cursor = tail.items.at(-1)?.seq ?? tail.snapshotSeq;
  while (forceRange || BigInt(targetSeq) > BigInt(cursor) + 1n) {
    forceRange = false;
    const page = await fetchAfter(cursor);
    if (!page.items.length) break;
    for (const item of page.items)
      mergeHistoryItem(queryClient, identity, workspaceId, channelId, item);
    data = queryClient.getQueryData<HistoryData>(key);
    tail = data?.pages.at(-1);
    const nextCursor = tail?.items.at(-1)?.seq ?? cursor;
    if (BigInt(nextCursor) <= BigInt(cursor)) break;
    cursor = nextCursor;
  }
  if (BigInt(targetSeq) > BigInt(cursor) + 1n)
    await queryClient.invalidateQueries({ queryKey: key, exact: true });
}

/**
 * Back on a conversation, events may have been missed while it wasn't watched. Only the
 * window it opened on is fetched again; older and newer pages load once scrolled to,
 * instead of every cached page being requested one after another.
 */
export function refreshHistoryWindow(queryClient: QueryClient, key: readonly unknown[]) {
  const data = queryClient.getQueryData<HistoryData>(key);
  if (!data) return;

  const window = data.pageParams.findIndex((param) => param.mode === 'window');
  if (window >= 0) {
    queryClient.setQueryData<HistoryData>(key, {
      pages: [data.pages[window]!],
      pageParams: [data.pageParams[window]!],
    });
  }
  void queryClient.invalidateQueries({ queryKey: key, exact: true });
}

/**
 * Once watched again, the opening window is asked for anew unless it was asked for since the
 * conversation was last left and already reaches where the channel ended when watching began.
 */
export function refreshHistoryWindowIfBehind(
  queryClient: QueryClient,
  key: readonly unknown[],
  lastEntrySeq: string,
) {
  const id = hashKey(key);
  const isRequestedSinceLeft = (windowRequestedAt.get(id) ?? 0) > (unwatchedAt.get(id) ?? 0);
  const tail = queryClient.getQueryData<HistoryData>(key)?.pages.at(-1);
  const isComplete = tail !== undefined && BigInt(tail.snapshotSeq) >= BigInt(lastEntrySeq);
  if (isRequestedSinceLeft && isComplete) return;

  refreshHistoryWindow(queryClient, key);
}

/**
 * Structural sharing for a history: an entry keeps its object while its content is the same,
 * wherever its page moved. Sharing by position, as the query cache does by default, would
 * rebuild every entry each time older history arrives in front of the pages already shown.
 */
export function shareHistory(previous: unknown, next: unknown): unknown {
  const before = previous as HistoryData | undefined;
  const after = next as HistoryData;
  if (!before?.pages || !after?.pages) return after;

  const entries = new Map<string, HistoryItem>();
  for (const page of before.pages) for (const item of page.items) entries.set(item.id, item);
  const pagesByFirstEntry = new Map(before.pages.map((page) => [pageKey(page), page]));

  const pages = after.pages.map((page) =>
    sharePage(pagesByFirstEntry.get(pageKey(page)), page, entries),
  );
  const unchanged =
    pages.length === before.pages.length &&
    pages.every((page, index) => page === before.pages[index]) &&
    replaceEqualDeep(before.pageParams, after.pageParams) === before.pageParams;
  return unchanged ? before : { ...after, pages };
}

function pageKey(page: HistoryPage) {
  return page.items[0]?.id ?? `empty:${page.snapshotSeq}`;
}

function sharePage(
  previous: HistoryPage | undefined,
  page: HistoryPage,
  entries: Map<string, HistoryItem>,
): HistoryPage {
  const items = page.items.map((item) => {
    const known = entries.get(item.id);
    return known ? replaceEqualDeep(known, item) : item;
  });
  const sameItems =
    previous?.items.length === items.length &&
    items.every((item, index) => item === previous.items[index]);
  const shared = { ...page, items: sameItems ? previous.items : items };
  return previous && replaceEqualDeep(previous, shared) === previous ? previous : shared;
}
