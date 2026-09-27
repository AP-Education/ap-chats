import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import type { HistoryItem, ReadState } from '../../messaging/types';
import { markRead } from '../api/read-state-api';
import { workspaceUnreadKey } from './useWorkspaceUnread';

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    seen.current.clear();
    sent.current = BigInt(readState?.lastReadEntrySeq ?? '0');
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [channelId, readState?.lastReadEntrySeq]);

  return useCallback(
    (seq: string) => {
      if (
        !token ||
        !firstUnreadSeq ||
        document.visibilityState !== 'visible' ||
        !document.hasFocus()
      )
        return;
      seen.current.add(seq);
      const firstUnread = BigInt(firstUnreadSeq);
      let next = firstUnread - 1n;
      for (const item of itemsRef.current) {
        const position = BigInt(item.seq);
        if (position < firstUnread) continue;
        if (position > next + 1n) break;
        if (
          !seen.current.has(item.seq) &&
          item.message.authorMemberId !== memberId &&
          item.message.markdown !== null
        )
          break;
        next = position;
      }
      if (next <= sent.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
        const position = next.toString();
        void markRead(token, workspaceId, channelId, position)
          .then(() => {
            if (next > sent.current) sent.current = next;
            void queryClient.invalidateQueries({
              queryKey: workspaceUnreadKey(identity, workspaceId),
            });
          })
          .catch(() => undefined);
      }, 350);
    },
    [token, identity, firstUnreadSeq, memberId, workspaceId, channelId, queryClient],
  );
}
