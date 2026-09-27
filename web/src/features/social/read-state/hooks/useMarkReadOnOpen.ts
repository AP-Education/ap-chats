import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import type { HistoryPage } from '../../messaging/types';
import { markRead } from '../api/read-state-api';
import { unreadDirectMessagesKey, workspaceUnreadKey } from '../queryKeys';
import type { ChannelUnread } from './useWorkspaceUnread';

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

      queryClient.setQueryData<ChannelUnread[]>(queryKey, (current) =>
        current?.map((item) =>
          item.channelId === channelId ? { ...item, unreadCount: 0, lastReadEntrySeq: seq } : item,
        ),
      );
      queryClient.setQueryData<Array<{ id: string }>>(
        unreadDirectMessagesKey(identity, workspaceId),
        (current) => current?.filter((item) => item.id !== channelId),
      );

      void markRead(authToken, workspaceId, channelId, seq).then(
        () => void queryClient.invalidateQueries({ queryKey }),
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
