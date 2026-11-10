import { useCallback, useEffect, useRef } from 'react';

import { useSocketEmit } from '@/features/realtime/hooks/useSocketEmit';

import type { TypingClientToServerEvents } from '../types';

const ACTIVE_RESEND_INTERVAL_MS = 2_500;
const STOP_AFTER_IDLE_MS = 3_000;

interface TypingBroadcast {
  /** Call on every composer keystroke while there's content to send. */
  notifyTyping: () => void;
  /** Call right away on send/clear, instead of waiting out the idle timeout. */
  notifyStopped: () => void;
}

// Debounced the way every chat client does this: an "is typing" ping repeats
// at most every few seconds while the person keeps editing, and a missing next
// keystroke within STOP_AFTER_IDLE_MS reads as them stopping, with no server
// round trip needed to decide that.
export function useTypingBroadcast(workspaceId: string, channelId: string): TypingBroadcast {
  const emit = useSocketEmit<TypingClientToServerEvents>();
  const lastSentAtRef = useRef(0);
  const isActiveRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const send = useCallback(
    (isTyping: boolean) => emit('social:typing', { workspaceId, channelId, isTyping }),
    [emit, workspaceId, channelId],
  );

  const notifyStopped = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    if (!isActiveRef.current) return;
    isActiveRef.current = false;
    send(false);
  }, [send]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (!isActiveRef.current || now - lastSentAtRef.current > ACTIVE_RESEND_INTERVAL_MS) {
      isActiveRef.current = true;
      lastSentAtRef.current = now;
      send(true);
    }
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(notifyStopped, STOP_AFTER_IDLE_MS);
  }, [notifyStopped, send]);

  useEffect(() => () => notifyStopped(), [workspaceId, channelId, notifyStopped]);

  // A closed/backgrounded tab rarely gets to unmount cleanly, so the server-side
  // relay and watchers' own expiry would otherwise carry the indicator for up to
  // STOP_AFTER_IDLE_MS/EXPIRE_AFTER_MS longer than the person is actually around.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) notifyStopped();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', notifyStopped);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', notifyStopped);
    };
  }, [notifyStopped]);

  return { notifyTyping, notifyStopped };
}
