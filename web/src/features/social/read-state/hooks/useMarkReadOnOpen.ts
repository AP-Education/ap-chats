import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useIsPageVisible } from '@/shared/hooks/useIsPageVisible';

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
  const pageVisible = useIsPageVisible();
  const attempted = useRef<string | null>(null);
  const snapshotSeq = page?.snapshotSeq;
  const unreadCount = page?.unreadCount ?? 0;

  useEffect(() => {
    if (!token || !snapshotSeq || unreadCount === 0 || snapshotSeq === '0' || !pageVisible) return;
    const requestKey = `${workspaceId}:${channelId}:${snapshotSeq}`;
    if (attempted.current === requestKey) return;
    attempted.current = requestKey;

    const queryKey = workspaceUnreadKey(identity, workspaceId);
    applyReadState(queryClient, identity, workspaceId, channelId, {
      lastReadEntrySeq: snapshotSeq,
      unreadCount: 0,
    });
    void markRead(token, workspaceId, channelId, snapshotSeq).then(
      (state) => applyReadState(queryClient, identity, workspaceId, channelId, state),
      () => {
        if (attempted.current === requestKey) attempted.current = null;
        void queryClient.invalidateQueries({ queryKey });
      },
    );
  }, [token, identity, workspaceId, channelId, snapshotSeq, unreadCount, queryClient, pageVisible]);
}
