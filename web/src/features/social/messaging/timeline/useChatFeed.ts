import type { TimelineFeed, TimelineSignal } from '@ap-education/timeline';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';

// Long enough for a slow join; the history is read again either way once it passes.
const WATCH_ACK_MS = 5000;

// Every producer that adds a position (messages, forwarding batches, calls) announces itself
// with one of these, and the timeline reads up to it the same way whichever produced it.
const APPENDING_EVENTS = new Set([
  'social.message.created',
  'social.forward.batch-created',
  'social.call.created',
]);

/** A conversation's live hints for the timeline: watched while open, read again on reconnect. */
export function useChatFeed(workspaceId: string, channelId: string): TimelineFeed {
  const { identity } = useQueryAuth();
  const { socket, status } = useConnection();
  const queryClient = useQueryClient();
  const listeners = useRef(new Set<(signal: TimelineSignal) => void>());

  const feed = useMemo<TimelineFeed>(
    () => ({
      subscribe(listener) {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
    }),
    [],
  );

  function hint(signal: TimelineSignal) {
    listeners.current.forEach((listener) => listener(signal));
  }

  useEffect(() => {
    // Without a live feed the window can't be trusted to have kept up, so it is read again.
    if (!socket || status !== 'connected') {
      listeners.current.forEach((listener) => listener({ type: 'reset' }));
      return;
    }

    // Joined before reading again: an entry created in between reaches the window either way.
    socket
      .timeout(WATCH_ACK_MS)
      .emit('social:watch', { workspaceId, channelId }, () =>
        listeners.current.forEach((listener) => listener({ type: 'reset' })),
      );
    return () => {
      socket.emit('social:unwatch', { workspaceId, channelId });
    };
  }, [socket, status, workspaceId, channelId]);

  useSocketEvent('social:changed', (event) => {
    if (event.workspaceId !== workspaceId || event.channelId !== channelId) return;

    if (event.type.startsWith('social.pin.')) {
      void queryClient.invalidateQueries({ queryKey: ['pins', identity, workspaceId, channelId] });
    }

    const upTo = event.lastSeq ?? event.seq;
    if (APPENDING_EVENTS.has(event.type)) {
      hint(upTo ? { type: 'appended', upTo } : { type: 'reset' });
      return;
    }

    if (event.messageId) {
      hint({ type: 'changed', keys: [event.messageId] });
      return;
    }

    hint({ type: 'reset' });
  });

  return feed;
}
