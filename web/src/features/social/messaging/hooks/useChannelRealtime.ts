import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';

import { getMessage, historyPage } from '../api/messages-api';
import { messagingQueryKeys } from '../queryKeys';
import type { HistoryPage } from '../types';
import type { PageCursor } from './useMessageHistory';

export function useChannelRealtime(
  workspaceId: string,
  channelId: string,
  isMember: boolean,
  targetMessageId?: string,
) {
  const { token, identity } = useQueryAuth();
  const { socket, status } = useConnection();
  const queryClient = useQueryClient();
  const pendingCreated = useRef(Promise.resolve());
  const key = useMemo(
    () => messagingQueryKeys.history(identity, workspaceId, channelId, targetMessageId),
    [identity, workspaceId, channelId, targetMessageId],
  );

  useEffect(() => {
    if (!socket || status !== 'connected' || !isMember) return;
    socket.emit('social:watch', { workspaceId, channelId });
    void queryClient.invalidateQueries({ queryKey: key });
    return () => {
      socket.emit('social:unwatch', { workspaceId, channelId });
    };
  }, [socket, status, workspaceId, channelId, isMember, queryClient, key]);

  useSocketEvent('social:changed', (event) => {
    if (event.workspaceId !== workspaceId || event.channelId !== channelId || !token) return;
    if (event.type.startsWith('social.pin.')) {
      void queryClient.invalidateQueries({ queryKey: ['pins', identity, workspaceId, channelId] });
    }

    if (event.type === 'social.message.created' || event.type === 'social.forward.batch-created') {
      pendingCreated.current = pendingCreated.current
        .then(async () => {
          const data = queryClient.getQueryData<InfiniteData<HistoryPage, PageCursor>>(key);
          const lastPage = data?.pages.at(-1);
          if (!lastPage) {
            await queryClient.invalidateQueries({ queryKey: key });
            return;
          }
          if (lastPage.hasNewer) {
            const eventSeq = event.lastSeq ?? event.seq;
            if (eventSeq && BigInt(eventSeq) > BigInt(lastPage.snapshotSeq)) {
              queryClient.setQueryData<InfiniteData<HistoryPage, PageCursor>>(key, (current) => {
                if (!current) return current;
                const pages = [...current.pages];
                const last = pages.at(-1)!;
                pages[pages.length - 1] = { ...last, snapshotSeq: eventSeq };
                return { ...current, pages };
              });
            }
            return;
          }
          const cursor = lastPage.items.at(-1)?.seq ?? lastPage.snapshotSeq;
          const page = await historyPage(token, workspaceId, channelId, 'after', cursor);
          if (!page.items.length) return;
          let changedDuringFetch = false;
          queryClient.setQueryData<InfiniteData<HistoryPage, PageCursor>>(key, (current) => {
            if (!current) return current;
            const tail = current.pages.at(-1);
            if ((tail?.items.at(-1)?.seq ?? tail?.snapshotSeq) !== cursor) {
              changedDuringFetch = true;
              return current;
            }
            return {
              pages: [...current.pages, page],
              pageParams: [
                ...current.pageParams,
                { mode: 'after', cursor, snapshot: page.snapshotSeq },
              ],
            };
          });
          if (changedDuringFetch) await queryClient.invalidateQueries({ queryKey: key });
        })
        .catch(() => queryClient.invalidateQueries({ queryKey: key }).then(() => undefined));
      return;
    }

    if (event.messageId) {
      void getMessage(token, workspaceId, channelId, event.messageId).then(
        (item) => {
          queryClient.setQueryData<InfiniteData<HistoryPage, PageCursor>>(key, (current) => {
            if (!current) return current;
            return {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((existing) =>
                  existing.message.id === item.message.id ? item : existing,
                ),
              })),
            };
          });
        },
        () => void queryClient.invalidateQueries({ queryKey: key }),
      );
      return;
    }

    void queryClient.invalidateQueries({ queryKey: key });
  });
}
