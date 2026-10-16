import type { InfiniteData } from '@tanstack/react-query';

import type { PageCursor } from '../messaging/hooks/useMessageHistory';
import type { HistoryPage } from '../messaging/types';

export type HistoryData = InfiniteData<HistoryPage, PageCursor>;

// Reading only moves forward, so a page fetched later never knows less than an earlier one.
export function peerReadSeqOf(pages: HistoryPage[]): string | null {
  const known = pages.map((page) => page.peerReadSeq).filter((seq) => seq !== null);
  if (!known.length) return null;

  return known.reduce((furthest, seq) => (BigInt(seq) > BigInt(furthest) ? seq : furthest));
}

export function withPeerRead(history: HistoryData, seq: string): HistoryData {
  const pages = history.pages.map((page) =>
    page.peerReadSeq !== null && BigInt(seq) > BigInt(page.peerReadSeq)
      ? { ...page, peerReadSeq: seq }
      : page,
  );

  return { ...history, pages };
}

export function isReadByPeer(seq: string, peerReadSeq: string | null): boolean {
  return peerReadSeq !== null && BigInt(seq) <= BigInt(peerReadSeq);
}
