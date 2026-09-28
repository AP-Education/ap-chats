import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import type { HistoryPage } from '../../messaging/types';
import { markRead } from '../api/read-state-api';
import { applyReadState } from '../applyReadState';
import { workspaceUnreadKey } from '../queryKeys';

export function useMarkReadOnOpen(
  workspaceId: string,
  channelId: string,
  page: HistoryPage | undefined,
) {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const attempted = useRef<string | null>(null);
  const snapshotSeq = page?.snapshotSeq;
  const unreadCount = page?.unreadCount ?? 0;

  useEffect(() => {
    if (!token || !snapshotSeq || unreadCount === 0 || snapshotSeq === '0') return;
    const authToken = token;
    const seq = snapshotSeq;
    const requestKey = `${workspaceId}:${channelId}:${snapshotSeq}`;
    const queryKey = workspaceUnreadKey(identity, workspaceId);

    function markOpenConversationRead() {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      if (attempted.current === requestKey) return;
      attempted.current = requestKey;

      applyReadState(queryClient, identity, workspaceId, channelId, {
        lastReadEntrySeq: seq,
        unreadCount: 0,
      });
      void markRead(authToken, workspaceId, channelId, seq).then(
        (state) => applyReadState(queryClient, identity, workspaceId, channelId, state),
        () => {
          if (attempted.current === requestKey) attempted.current = null;
          void queryClient.invalidateQueries({ queryKey });
        },
      );
    }

    markOpenConversationRead();
    window.addEventListener('focus', markOpenConversationRead);
    document.addEventListener('visibilitychange', markOpenConversationRead);
    return () => {
      window.removeEventListener('focus', markOpenConversationRead);
      document.removeEventListener('visibilitychange', markOpenConversationRead);
    };
  }, [token, identity, workspaceId, channelId, snapshotSeq, unreadCount, queryClient]);
}
