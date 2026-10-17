import { type TouchEvent, useRef } from 'react';

// Past a tap's jitter, so tapping a message or a link leaves the keyboard up.
const DRAG_SLOP = 10;

/**
 * Discord's rule on a chat with the keyboard up: dragging the history puts the keyboard away,
 * once per drag, and the history scrolls as usual. Touch events, since a native scroll cancels
 * pointers; a scroll the timeline makes itself has no touch and leaves the keyboard alone.
 */
export function useDragDismissesKeyboard(dismissKeyboard: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (event: TouchEvent) => {
      const touch = event.touches[0];
      start.current =
        touch && event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchMove: (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start.current || !touch) return;
      if (Math.abs(touch.clientY - start.current.y) < DRAG_SLOP) return;

      start.current = null;
      dismissKeyboard();
    },
    onTouchEnd: () => {
      start.current = null;
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}
