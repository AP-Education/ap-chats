import { type CSSProperties, type TouchEvent, useState } from 'react';

import { useTouchGesture } from './useTouchGesture';

interface UseSwipeDrawerOptions {
  enabled: boolean;
  open: boolean;
  locationKey: string;
  onOpen: () => void;
  onClose: () => void;
  getWidth: () => number;
}

function shouldStart(event: TouchEvent<HTMLElement>): boolean {
  const target = event.target as Element;
  return !target.closest(
    'input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"], [data-swipe-ignore]',
  );
}

interface DrawerDrag {
  locationKey: string;
  startedOpen: boolean;
  progress: number;
}

/**
 * Swipe from the left edge to open or close a drawer. Nested gestures (swipe to reply) share
 * the touch with it through `useTouchGesture`; drag progress is the `--drawer-progress` variable.
 */
export function useSwipeDrawer({
  enabled,
  open,
  locationKey,
  onOpen,
  onClose,
  getWidth,
}: UseSwipeDrawerOptions) {
  const [drag, setDrag] = useState<DrawerDrag | null>(null);
  const activeDrag =
    enabled && drag?.locationKey === locationKey && drag.startedOpen === open ? drag : null;

  function updateProgress(startedOpen: boolean, distance: number) {
    const width = getWidth();
    const progress = Math.min(1, Math.max(0, Number(startedOpen) + distance / width));
    setDrag({ locationKey, startedOpen, progress });
  }

  const openGesture = useTouchGesture({
    enabled: enabled && !open,
    resetKey: locationKey,
    shouldStart,
    swipeDistance: 48,
    flickVelocity: 0.25,
    axisRatio: 1.1,
    directionSlop: 8,
    onSwipeProgress: (distance) => {
      if (distance > 0) updateProgress(false, distance);
      else setDrag(null);
    },
    onSwipeEnd: () => setDrag(null),
    onSwipeRight: onOpen,
  });
  const closeGesture = useTouchGesture({
    enabled: enabled && open,
    resetKey: locationKey,
    shouldStart,
    swipeDistance: 48,
    flickVelocity: 0.25,
    axisRatio: 1.1,
    directionSlop: 8,
    onSwipeProgress: (distance) => {
      if (distance < 0) updateProgress(true, distance);
      else setDrag(null);
    },
    onSwipeEnd: () => setDrag(null),
    onSwipeLeft: onClose,
  });

  const { onTouchStart: onOpenStart, ...openHandlers } = openGesture;
  const { onTouchStart: onCloseStart, ...closeHandlers } = closeGesture;
  return {
    dragging: !!activeDrag,
    style: activeDrag ? ({ '--drawer-progress': activeDrag.progress } as CSSProperties) : undefined,
    openGesture: { ...openHandlers, onTouchStartCapture: onOpenStart },
    closeGesture: { ...closeHandlers, onTouchStartCapture: onCloseStart },
  };
}
