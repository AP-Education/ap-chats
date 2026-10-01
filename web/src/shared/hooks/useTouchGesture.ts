import { type MouseEvent, type TouchEvent, useEffect, useLayoutEffect, useRef } from 'react';

interface TouchGestureOptions {
  onSwipeRight?: () => boolean | void;
  onSwipeLeft?: () => boolean | void;
  onSwipeProgress?: (distance: number) => void;
  onSwipeEnd?: () => void;
  onLongPress?: () => void;
  shouldStart?: (event: TouchEvent<HTMLElement>) => boolean;
  swipeDistance?: number;
  /** A fast, short swipe below `swipeDistance` still commits once it clears this
   * velocity (px/ms) at release — the same "flick" native apps recognize instead
   * of requiring the full travel distance from a slow drag. */
  flickVelocity?: number;
}

// Shared "settle" easing for anything that drag-follows a touch and then
// animates the remaining distance on release (nav sheet, message reply swipe)
// — one feel across the app instead of each gesture picking its own curve.
export const SWIPE_SETTLE_TRANSITION = 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)';

const DEFAULT_SWIPE_DISTANCE = 72;
const DEFAULT_FLICK_VELOCITY = 0.5; // px/ms
const MIN_FLICK_DISTANCE = 24; // ignores a stray tap that happens to read as "fast"

interface GestureState {
  x: number;
  y: number;
  /** Position and time of the most recent touchmove — velocity is measured over
   * this final stretch, not the whole gesture, since that's what actually reads
   * as "a flick" to the person doing it. */
  lastX: number;
  lastT: number;
  held: boolean;
  moved: boolean;
}

export function useTouchGesture(options: TouchGestureOptions) {
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });
  const gesture = useRef<GestureState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const rafId = useRef<number | null>(null);
  const pendingDx = useRef<number | null>(null);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function flushProgress() {
    rafId.current = null;
    if (pendingDx.current === null) return;
    const dx = pendingDx.current;
    pendingDx.current = null;
    optionsRef.current.onSwipeProgress?.(dx);
  }

  // touchmove can fire well above the display's paint rate on some devices —
  // batching to one callback per animation frame is what keeps the dragged
  // element's visual updates from fighting each other mid-frame.
  function scheduleProgress(dx: number) {
    pendingDx.current = dx;
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(flushProgress);
  }

  function cancelScheduledProgress() {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    pendingDx.current = null;
  }

  function suppressSyntheticClick() {
    suppressClick.current = true;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      suppressClick.current = false;
    }, 700);
  }

  useEffect(
    () => () => {
      clearTimer();
      cancelScheduledProgress();
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    gesture.current = null;
    clearTimer();
    cancelScheduledProgress();
    if (event.touches.length !== 1 || optionsRef.current.shouldStart?.(event) === false) return;
    const touch = event.touches[0];
    gesture.current = {
      x: touch.clientX,
      y: touch.clientY,
      lastX: touch.clientX,
      lastT: event.timeStamp,
      held: false,
      moved: false,
    };
    if (optionsRef.current.onLongPress) {
      timer.current = setTimeout(() => {
        const current = gesture.current;
        if (!current || current.moved) return;
        current.held = true;
        suppressSyntheticClick();
        optionsRef.current.onLongPress?.();
      }, 500);
    }
  }

  function onTouchMove(event: TouchEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (Math.abs(touch.clientX - current.x) > 10 || Math.abs(touch.clientY - current.y) > 10) {
      current.moved = true;
      clearTimer();
    }
    const dx = touch.clientX - current.x;
    const dy = touch.clientY - current.y;
    current.lastX = touch.clientX;
    current.lastT = event.timeStamp;
    if (!current.held && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      scheduleProgress(dx);
    }
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    clearTimer();
    cancelScheduledProgress();
    const current = gesture.current;
    gesture.current = null;
    if (!current || !event.changedTouches.length) {
      optionsRef.current.onSwipeEnd?.();
      return;
    }
    if (current.held) {
      optionsRef.current.onSwipeEnd?.();
      event.preventDefault();
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - current.x;
    const dy = touch.clientY - current.y;
    let committed = false;

    if (Math.abs(dx) >= Math.abs(dy) * 1.25) {
      const distanceThreshold = optionsRef.current.swipeDistance ?? DEFAULT_SWIPE_DISTANCE;
      const flickVelocityThreshold = optionsRef.current.flickVelocity ?? DEFAULT_FLICK_VELOCITY;
      const elapsed = Math.max(event.timeStamp - current.lastT, 1);
      const velocity = Math.abs(touch.clientX - current.lastX) / elapsed;
      const committedByDistance = Math.abs(dx) >= distanceThreshold;
      const committedByFlick =
        Math.abs(dx) >= MIN_FLICK_DISTANCE && velocity >= flickVelocityThreshold;

      if (committedByDistance || committedByFlick) {
        const handled =
          dx > 0 ? optionsRef.current.onSwipeRight?.() : optionsRef.current.onSwipeLeft?.();
        committed =
          handled !== false &&
          (dx > 0 ? !!optionsRef.current.onSwipeRight : !!optionsRef.current.onSwipeLeft);
      }
    }

    // Fires after the commit decision (not before) so a caller can tell, inside
    // onSwipeEnd, whether this gesture just committed — see useMobileNavSheet for
    // why that matters (committing already drove the element to its resting
    // position; onSwipeEnd must not then animate it back to where it started).
    optionsRef.current.onSwipeEnd?.();

    if (committed) {
      suppressSyntheticClick();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function onTouchCancel() {
    clearTimer();
    cancelScheduledProgress();
    optionsRef.current.onSwipeEnd?.();
    gesture.current = null;
  }

  function onClickCapture(event: MouseEvent<HTMLElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    event.preventDefault();
    event.stopPropagation();
  }

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onClickCapture };
}
