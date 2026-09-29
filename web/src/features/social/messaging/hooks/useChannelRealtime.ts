import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';

import { getEntry, historyPage } from '../api/messages-api';
import { catchUpHistory, mergeHistoryItem } from '../history-cache';
import { messagingQueryKeys } from '../queryKeys';
import type { HistoryPage } from '../types';
import type { PageCursor } from './useMessageHistory';

// Every producer that adds a channel_entries position (messages, forwarding
// batches, calls) announces itself with one of these; the merge logic below
// is the same regardless of which produced it.
const CREATED_EVENT_TYPES = new Set([
  'social.message.created',
  'social.forward.batch-created',
  'social.call.created',
]);

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

    if (CREATED_EVENT_TYPES.has(event.type)) {
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
          const eventSeq = event.lastSeq ?? event.seq;
          if (eventSeq && BigInt(eventSeq) <= BigInt(cursor)) return;
          if (eventSeq)
            await catchUpHistory(
              queryClient,
              identity,
              workspaceId,
              channelId,
              key,
              eventSeq,
              (cursor) => historyPage(token, workspaceId, channelId, 'after', cursor),
              event.type === 'social.forward.batch-created',
            );
          const entryId = event.messageId ?? event.callId;
          if (entryId && event.type !== 'social.forward.batch-created') {
            const item = await queryClient.fetchQuery({
              queryKey: [
                ...messagingQueryKeys.channel(identity, workspaceId, channelId),
                'item',
                entryId,
              ],
              queryFn: () => getEntry(token, workspaceId, channelId, entryId),
              staleTime: 30_000,
            });
            mergeHistoryItem(queryClient, identity, workspaceId, channelId, item);
          }
        })
        .catch(() => queryClient.invalidateQueries({ queryKey: key }).then(() => undefined));
      return;
    }

    if (event.messageId) {
      void getEntry(token, workspaceId, channelId, event.messageId).then(
        (item) => {
          queryClient.setQueryData<InfiniteData<HistoryPage, PageCursor>>(key, (current) => {
            if (!current) return current;
            return {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((existing) => (existing.id === item.id ? item : existing)),
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
