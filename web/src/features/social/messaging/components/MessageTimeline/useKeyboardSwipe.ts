import { type TouchEvent, useRef } from 'react';

import {
  closesOnRelease,
  closesWhileDragging,
  type KeyboardSwipe,
  moveSwipe,
  startSwipe,
  type SwipePoint,
} from './keyboard-swipe';

function touchPoint(event: TouchEvent, touch: { clientX: number; clientY: number }): SwipePoint {
  return { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
}

/**
 * Telegram's split on a chat with the keyboard up: a small swipe scrolls the history, a long pull
 * or a quick flick down closes the keyboard. Touch events, since a native scroll cancels pointers.
 */
export function useKeyboardSwipe(closeKeyboard: () => void) {
  const swipe = useRef<KeyboardSwipe | null>(null);

  function close() {
    swipe.current = null;
    closeKeyboard();
  }

  return {
    onTouchStart: (event: TouchEvent) => {
      const touch = event.touches[0];
      const singleFinger = event.touches.length === 1;
      swipe.current = touch && singleFinger ? startSwipe(touchPoint(event, touch)) : null;
    },
    onTouchMove: (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!swipe.current || !touch) return;

      swipe.current = moveSwipe(swipe.current, touchPoint(event, touch));
      if (closesWhileDragging(swipe.current)) close();
    },
    onTouchEnd: (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!swipe.current || !touch) return;

      const released = moveSwipe(swipe.current, touchPoint(event, touch));
      if (closesOnRelease(released)) close();
      else swipe.current = null;
    },
    onTouchCancel: () => {
      swipe.current = null;
    },
  };
}
