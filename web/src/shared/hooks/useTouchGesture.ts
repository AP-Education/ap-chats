import { type MouseEvent, type TouchEvent, useEffect, useLayoutEffect, useRef } from 'react';

interface TouchGestureOptions {
  onSwipeRight?: () => boolean | void;
  onSwipeLeft?: () => boolean | void;
  onSwipeProgress?: (distance: number) => void;
  onSwipeEnd?: () => void;
  onLongPress?: () => void;
  shouldStart?: (event: TouchEvent<HTMLElement>) => boolean;
  swipeDistance?: number;
}

export function useTouchGesture(options: TouchGestureOptions) {
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });
  const gesture = useRef<{ x: number; y: number; held: boolean; moved: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
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
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    gesture.current = null;
    clearTimer();
    if (event.touches.length !== 1 || optionsRef.current.shouldStart?.(event) === false) return;
    const touch = event.touches[0];
    gesture.current = { x: touch.clientX, y: touch.clientY, held: false, moved: false };
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
    if (!current.held && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      optionsRef.current.onSwipeProgress?.(dx);
    }
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    clearTimer();
    optionsRef.current.onSwipeEnd?.();
    const current = gesture.current;
    gesture.current = null;
    if (!current || !event.changedTouches.length) return;
    if (current.held) {
      event.preventDefault();
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - current.x;
    const dy = touch.clientY - current.y;
    if (
      Math.abs(dx) < (optionsRef.current.swipeDistance ?? 72) ||
      Math.abs(dx) < Math.abs(dy) * 1.25
    )
      return;
    const handled =
      dx > 0 ? optionsRef.current.onSwipeRight?.() : optionsRef.current.onSwipeLeft?.();
    if (
      handled === false ||
      (dx > 0 && !optionsRef.current.onSwipeRight) ||
      (dx < 0 && !optionsRef.current.onSwipeLeft)
    )
      return;
    suppressSyntheticClick();
    event.preventDefault();
    event.stopPropagation();
  }

  function onTouchCancel() {
    clearTimer();
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
