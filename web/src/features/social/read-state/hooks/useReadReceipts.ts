import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';
import { isPageVisible } from '@/shared/hooks/useIsPageVisible';

import type { HistoryItem, ReadState } from '../../messaging/types';
import { isMessageItem } from '../../messaging/types';
import { markRead } from '../api/read-state-api';
import { applyReadState } from '../applyReadState';

export function useReadReceipts(
  workspaceId: string,
  channelId: string,
  items: HistoryItem[],
  firstUnreadSeq: string | null,
  readState: ReadState | null,
  memberId: string | undefined,
) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const seen = useRef(new Set<string>());
  const sent = useRef(BigInt(readState?.lastReadEntrySeq ?? '0'));
  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    seen.current.clear();
    sent.current = BigInt(readState?.lastReadEntrySeq ?? '0');
  }, [channelId, readState?.lastReadEntrySeq]);

  const debouncedMarkRead = useDebouncedCallback((next: bigint) => {
    if (!token || !isPageVisible()) return;
    void markRead(token, workspaceId, channelId, next.toString())
      .then((state) => {
        if (next > sent.current) sent.current = next;
        applyReadState(queryClient, identity, workspaceId, channelId, state);
      })
      .catch(() => undefined);
  }, 350);

  return useCallback(
    (seq: string) => {
      if (!token || !firstUnreadSeq || !isPageVisible()) return;
      seen.current.add(seq);
      const firstUnread = BigInt(firstUnreadSeq);
      let next = firstUnread - 1n;
      for (const item of itemsRef.current) {
        const position = BigInt(item.seq);
        if (position < firstUnread) continue;
        if (position > next + 1n) break;
        if (
          isMessageItem(item) &&
          !seen.current.has(item.seq) &&
          item.message.authorMemberId !== memberId &&
          item.message.markdown !== null
        )
          break;
        next = position;
      }
      if (next <= sent.current) return;
      debouncedMarkRead(next);
    },
    [token, firstUnreadSeq, memberId, debouncedMarkRead],
  );
}
