import { type RefObject, useEffect, useEffectEvent, useState } from 'react';

import { selectionHaptic } from '@/shared/lib/haptics';
import {
  PULL_HOLD,
  PULL_TRIGGER,
  type PullIntent,
  pullIntent,
  pullOffset,
} from '@/shared/lib/pull-to-refresh';

// Long enough that a refresh answered at once still reads as one instead of flashing by.
const MIN_REFRESH_MS = 600;

/**
 * Pulls the list down from its top and refreshes it on letting go past the trigger. The offset
 * follows the finger through CSS variables, so the list never re-renders while it moves.
 */
export function usePullToRefresh(
  rootRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<unknown>,
) {
  const [armed, setArmed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useEffectEvent(onRefresh);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let start: { x: number; y: number } | null = null;
    let intent: PullIntent = 'undecided';
    let offset = 0;
    let busy = false;

    function moveTo(next: number) {
      offset = next;
      root!.style.setProperty('--pull-offset', `${next}px`);
      root!.style.setProperty('--pull-progress', String(Math.min(1, next / PULL_TRIGGER)));
    }

    function release() {
      start = null;
      root!.removeAttribute('data-pulling');
      setArmed(false);
    }

    function onTouchStart(event: TouchEvent) {
      const [touch] = event.touches;
      const canPull = !busy && event.touches.length === 1 && !isScrolledDown(event.target);
      start = canPull && touch ? { x: touch.clientX, y: touch.clientY } : null;
      intent = 'undecided';
    }

    function onTouchMove(event: TouchEvent) {
      const [touch] = event.touches;
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (intent === 'undecided') {
        intent = pullIntent(dx, dy);
        if (intent === 'pull') root!.setAttribute('data-pulling', '');
      }
      if (intent === 'ignore') return;

      // At the top a move down can only overscroll; taken from the first pixel, or WebKit starts
      // its own bounce and no later move can be stopped.
      const isDownward = dy > 0 && dy >= Math.abs(dx);
      if (isDownward && event.cancelable) event.preventDefault();
      if (intent !== 'pull') return;

      const wasArmed = offset >= PULL_TRIGGER;
      moveTo(pullOffset(dy));
      const isArmed = offset >= PULL_TRIGGER;
      if (isArmed !== wasArmed) {
        if (isArmed) selectionHaptic();
        setArmed(isArmed);
      }
    }

    async function onTouchEnd() {
      const pulled = start && intent === 'pull';
      const triggered = pulled && offset >= PULL_TRIGGER;
      release();
      if (!pulled) return;
      if (!triggered) {
        moveTo(0);
        return;
      }

      busy = true;
      setRefreshing(true);
      moveTo(PULL_HOLD);
      await Promise.all([refresh().catch(() => undefined), delay(MIN_REFRESH_MS)]);
      busy = false;
      setRefreshing(false);
      moveTo(0);
    }

    function onTouchCancel() {
      release();
      if (!busy) moveTo(0);
    }

    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd);
    root.addEventListener('touchcancel', onTouchCancel);
    return () => {
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [rootRef]);

  return { armed, refreshing };
}

// A list scrolled down anywhere above the finger scrolls back up first; only its top pulls.
function isScrolledDown(target: EventTarget | null): boolean {
  for (let node = target as Element | null; node; node = node.parentElement) {
    if (node.scrollTop > 0) return true;
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
