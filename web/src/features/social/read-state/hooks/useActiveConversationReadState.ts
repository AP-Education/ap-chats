import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';
import { isPageVisible, useIsPageVisible } from '@/shared/hooks/useIsPageVisible';

import type { HistoryPage } from '../../messaging/types';
import { markRead } from '../api/read-state-api';
import { applyOptimisticReadState, applyReadState } from '../applyReadState';
import { workspaceUnreadKey } from '../queryKeys';
import type { ChannelUnread } from './useWorkspaceUnread';

export function useActiveConversationReadState(
  workspaceId: string,
  channelId: string,
  page: HistoryPage | undefined,
) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const pageVisible = useIsPageVisible();
  const requested = useRef(0n);
  const latestEventSeq = useRef(0n);
  const snapshotSeq = page?.snapshotSeq;
  const readCursor = page?.readState?.lastReadEntrySeq;
  const debouncedMarkRead = useDebouncedCallback((seq: string) => {
    if (!token) return;
    void markRead(token, workspaceId, channelId, seq).then(
      (state) => applyReadState(queryClient, identity, workspaceId, channelId, state),
      () => {
        if (requested.current === BigInt(seq)) requested.current = 0n;
        void queryClient.invalidateQueries({
          queryKey: workspaceUnreadKey(identity, workspaceId),
          exact: true,
        });
      },
    );
  }, 150);

  const consume = useCallback(
    (seq: bigint) => {
      if (!token || !readCursor || !isPageVisible() || seq <= requested.current || seq === 0n)
        return;
      const summaryCursor = queryClient
        .getQueryData<ChannelUnread[]>(workspaceUnreadKey(identity, workspaceId))
        ?.find((entry) => entry.channelId === channelId)?.lastReadEntrySeq;
      if (seq <= BigInt(readCursor) || (summaryCursor && seq <= BigInt(summaryCursor))) return;
      requested.current = seq;
      applyOptimisticReadState(queryClient, identity, workspaceId, channelId, {
        lastReadEntrySeq: seq.toString(),
        unreadCount: 0,
      });
      debouncedMarkRead(seq.toString());
    },
    [token, readCursor, identity, workspaceId, channelId, queryClient, debouncedMarkRead],
  );

  useSocketEvent('social:unread', (event) => {
    if (
      event.workspaceId !== workspaceId ||
      event.channelId !== channelId ||
      event.operation !== 'append'
    )
      return;
    for (const entry of event.entries) {
      const seq = BigInt(entry.seq);
      if (seq > latestEventSeq.current) latestEventSeq.current = seq;
    }
    consume(latestEventSeq.current);
  });

  useEffect(() => {
    if (!pageVisible || !readCursor) return;
    const snapshot = BigInt(snapshotSeq ?? '0');
    consume(snapshot > latestEventSeq.current ? snapshot : latestEventSeq.current);
  }, [snapshotSeq, readCursor, pageVisible, consume]);
}
