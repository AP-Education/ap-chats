import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { PageCursor } from './hooks/useMessageHistory';
import { messagingQueryKeys } from './queryKeys';
import type { HistoryItem, HistoryPage } from './types';

type HistoryData = InfiniteData<HistoryPage, PageCursor>;

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
