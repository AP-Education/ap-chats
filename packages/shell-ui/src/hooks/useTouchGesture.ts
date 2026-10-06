import {
  type MouseEvent,
  type TouchEvent as ReactTouchEvent,
  useLayoutEffect,
  useRef,
} from 'react';

interface TouchGestureOptions {
  enabled?: boolean;
  resetKey?: string;
  onSwipeRight?: () => boolean | void;
  onSwipeLeft?: () => boolean | void;
  onSwipeProgress?: (distance: number) => void;
  onSwipeEnd?: () => void;
  onLongPress?: () => void;
  shouldLongPress?: (event: ReactTouchEvent<HTMLElement>) => boolean;
  shouldStart?: (event: ReactTouchEvent<HTMLElement>) => boolean;
  swipeDistance?: number;
  flickVelocity?: number;
  axisRatio?: number;
  directionSlop?: number;
}

export const SWIPE_SETTLE_TRANSITION = 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)';

const DEFAULT_SWIPE_DISTANCE = 72;
const DEFAULT_FLICK_VELOCITY = 0.5;
const MIN_FLICK_DISTANCE = 24;
const VELOCITY_WINDOW = 100;
const MAX_GESTURE_DURATION = 10_000;

const activeTouchMoves = new Set<(event: TouchEvent) => void>();
let touchSurfaceCount = 0;

function dispatchTouchMove(event: TouchEvent) {
  for (const handler of activeTouchMoves) handler(event);
}

function retainTouchMoveListener() {
  if (touchSurfaceCount++ === 0) {
    // WebKit needs the blocking listener before touchstart, including the first
    // swipe after navigation. React's delegated touch listeners are passive.
    window.addEventListener('touchmove', dispatchTouchMove, { capture: true, passive: false });
  }
  return () => {
    if (--touchSurfaceCount === 0) window.removeEventListener('touchmove', dispatchTouchMove, true);
  };
}

interface GestureState {
  touchId: number;
  x: number;
  y: number;
  axis: 'pending' | 'horizontal';
  samples: { x: number; time: number }[];
  held: boolean;
  moved: boolean;
  claimed: boolean;
}

function findTouch(touches: TouchList, identifier: number): Touch | undefined {
  for (let index = 0; index < touches.length; index++) {
    if (touches[index].identifier === identifier) return touches[index];
  }
}

export function useTouchGesture(options: TouchGestureOptions) {
  const optionsRef = useRef(options);
  const gesture = useRef<GestureState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const rafId = useRef<number | null>(null);
  const pendingDx = useRef<number | null>(null);
  const removeListeners = useRef<(() => void) | null>(null);

  function clearTimer() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }

  function cancelScheduledProgress() {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    pendingDx.current = null;
  }

  function endGesture() {
    if (!gesture.current) return;
    if (gesture.current.claimed) suppressSyntheticClick();
    gesture.current = null;
    clearTimer();
    if (expiryTimer.current !== null) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
    cancelScheduledProgress();
    removeListeners.current?.();
    removeListeners.current = null;
    optionsRef.current.onSwipeEnd?.();
  }

  useLayoutEffect(() => {
    optionsRef.current = options;
  });
  useLayoutEffect(() => {
    endGesture();
    // Cancels an in-flight gesture when its screen or enabled state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled, options.resetKey]);

  useLayoutEffect(
    () => {
      const release = retainTouchMoveListener();
      return () => {
        endGesture();
        if (clickTimer.current !== null) clearTimeout(clickTimer.current);
        release();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function scheduleProgress(dx: number) {
    if (!optionsRef.current.onSwipeProgress) return;
    pendingDx.current = dx;
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const distance = pendingDx.current;
      pendingDx.current = null;
      if (gesture.current && distance !== null) optionsRef.current.onSwipeProgress?.(distance);
    });
  }

  function suppressSyntheticClick() {
    suppressClick.current = true;
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      suppressClick.current = false;
    }, 700);
  }

  function onTouchMove(event: TouchEvent) {
    const current = gesture.current;
    if (!current) return;
    const touch = findTouch(event.touches, current.touchId);
    if (!touch || event.touches.length !== 1 || !event.cancelable) {
      endGesture();
      return;
    }
    const dx = touch.clientX - current.x;
    const dy = touch.clientY - current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      current.moved = true;
      clearTimer();
    }
    if (current.axis === 'pending') {
      const slop = optionsRef.current.directionSlop ?? 12;
      const ratio = optionsRef.current.axisRatio ?? 1.25;
      if (Math.abs(dy) >= slop && Math.abs(dy) > Math.abs(dx) * ratio) {
        endGesture();
        return;
      }
      if (Math.abs(dx) >= slop && Math.abs(dx) > Math.abs(dy) * ratio) {
        current.axis = 'horizontal';
        current.moved = true;
        clearTimer();
      }
    }
    sampleVelocity(current, touch.clientX, event.timeStamp);
    if (!current.held && current.axis === 'horizontal') {
      const handle = dx > 0 ? optionsRef.current.onSwipeRight : optionsRef.current.onSwipeLeft;
      if (handle) current.claimed = true;
      // WebKit may start vertical scrolling even after a horizontal pan-y swipe.
      // A non-passive touchmove keeps a claimed swipe out of native scrolling.
      if (current.claimed) event.preventDefault();
      scheduleProgress(dx);
    }
  }

  function sampleVelocity(current: GestureState, x: number, time: number): number {
    current.samples = current.samples.filter((sample) => time - sample.time <= VELOCITY_WINDOW);
    current.samples.push({ x, time });
    const first = current.samples[0];
    return (x - first.x) / Math.max(time - first.time, 1);
  }

  function onTouchEnd(event: TouchEvent) {
    const current = gesture.current;
    if (!current) return;
    const touch = findTouch(event.changedTouches, current.touchId);
    if (!touch) return;
    let committed = current.held;
    try {
      if (!current.held) {
        const dx = touch.clientX - current.x;
        const dy = touch.clientY - current.y;
        const velocity = sampleVelocity(current, touch.clientX, event.timeStamp);
        const byDistance =
          Math.abs(dx) >= (optionsRef.current.swipeDistance ?? DEFAULT_SWIPE_DISTANCE);
        const byFlick =
          Math.abs(dx) >= MIN_FLICK_DISTANCE &&
          Math.sign(velocity) === Math.sign(dx) &&
          Math.abs(velocity) >= (optionsRef.current.flickVelocity ?? DEFAULT_FLICK_VELOCITY);
        const horizontal =
          current.axis === 'horizontal' ||
          Math.abs(dx) > Math.abs(dy) * (optionsRef.current.axisRatio ?? 1.25);
        if (horizontal && (byDistance || byFlick)) {
          const handle = dx > 0 ? optionsRef.current.onSwipeRight : optionsRef.current.onSwipeLeft;
          committed = !!handle && handle() !== false;
        }
      }
    } finally {
      endGesture();
    }
    if (committed || current.claimed) {
      suppressSyntheticClick();
      if (event.cancelable) event.preventDefault();
    }
  }

  function onTouchCancel(event: TouchEvent) {
    const current = gesture.current;
    if (current && findTouch(event.changedTouches, current.touchId)) endGesture();
  }

  function onAdditionalTouch(event: TouchEvent) {
    if (event.touches.length !== 1) endGesture();
  }

  function onVisibilityChange() {
    if (document.hidden) endGesture();
  }

  function onTouchStart(event: ReactTouchEvent<HTMLElement>) {
    endGesture();
    suppressClick.current = false;
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    clickTimer.current = null;
    if (
      event.touches.length !== 1 ||
      optionsRef.current.enabled === false ||
      optionsRef.current.shouldStart?.(event) === false
    )
      return;
    const touch = event.touches[0];
    gesture.current = {
      touchId: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      axis: 'pending',
      samples: [{ x: touch.clientX, time: event.timeStamp }],
      held: false,
      moved: false,
      claimed: false,
    };

    activeTouchMoves.add(onTouchMove);
    window.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
    window.addEventListener('touchcancel', onTouchCancel, true);
    window.addEventListener('touchstart', onAdditionalTouch, true);
    window.addEventListener('blur', endGesture);
    window.addEventListener('pagehide', endGesture);
    window.addEventListener('resize', endGesture);
    document.addEventListener('visibilitychange', onVisibilityChange);
    removeListeners.current = () => {
      activeTouchMoves.delete(onTouchMove);
      window.removeEventListener('touchend', onTouchEnd, true);
      window.removeEventListener('touchcancel', onTouchCancel, true);
      window.removeEventListener('touchstart', onAdditionalTouch, true);
      window.removeEventListener('blur', endGesture);
      window.removeEventListener('pagehide', endGesture);
      window.removeEventListener('resize', endGesture);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    expiryTimer.current = setTimeout(endGesture, MAX_GESTURE_DURATION);
    if (optionsRef.current.onLongPress && optionsRef.current.shouldLongPress?.(event) !== false) {
      timer.current = setTimeout(() => {
        const current = gesture.current;
        if (!current || current.moved) return;
        current.held = true;
        suppressSyntheticClick();
        optionsRef.current.onLongPress?.();
      }, 500);
    }
  }

  function onClickCapture(event: MouseEvent<HTMLElement>) {
    if (!suppressClick.current || event.detail === 0) return;
    suppressClick.current = false;
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    event.preventDefault();
    event.stopPropagation();
  }

  return { onTouchStart, onClickCapture };
}
