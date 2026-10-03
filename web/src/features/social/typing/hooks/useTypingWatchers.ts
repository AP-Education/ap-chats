import { useEffect, useRef, useState } from 'react';

import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';

import type { TypingServerToClientEvents } from '../types';

const EXPIRE_AFTER_MS = 5_000;

// Safety net for a lost "stopped typing" signal (closed tab, dropped socket):
// each typing member expires on its own if no refresh arrives before this.
export function useTypingWatchers(workspaceId: string, channelId: string): string[] {
  const [typingMemberIds, setTypingMemberIds] = useState<string[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      setTypingMemberIds([]);
    };
  }, [workspaceId, channelId]);

  useSocketEvent<TypingServerToClientEvents>('social:typing', (event) => {
    if (event.workspaceId !== workspaceId || event.channelId !== channelId) return;
    const timers = timersRef.current;
    clearTimeout(timers.get(event.memberId));

    if (!event.isTyping) {
      timers.delete(event.memberId);
      setTypingMemberIds((current) => current.filter((id) => id !== event.memberId));
      return;
    }

    timers.set(
      event.memberId,
      setTimeout(() => {
        timers.delete(event.memberId);
        setTypingMemberIds((current) => current.filter((id) => id !== event.memberId));
      }, EXPIRE_AFTER_MS),
    );
    setTypingMemberIds((current) =>
      current.includes(event.memberId) ? current : [...current, event.memberId],
    );
  });

  return typingMemberIds;
}
