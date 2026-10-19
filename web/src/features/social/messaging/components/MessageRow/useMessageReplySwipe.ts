import { useTouchGesture } from '@ap-education/ui';
import { type TouchEvent, useState } from 'react';

import { selectionHaptic } from '@/shared/lib/haptics';

const REPLY_DISTANCE = 48;
const MAX_OFFSET = 64;

function startsGesture(target: EventTarget) {
  return !(target as Element).closest(
    'input, textarea, select, [contenteditable="true"], [role="slider"], [data-swipe-ignore]',
  );
}

// A link or button keeps its own press, and the system's long press with it.
function holdsForMenu(target: EventTarget) {
  return !(target as Element).closest('a, button');
}

interface MessageReplySwipeOptions {
  messageId: string;
  enabled: boolean;
  canReply: boolean;
  onReply: () => void;
  onLongPress: () => void;
}

export function useMessageReplySwipe({
  messageId,
  enabled,
  canReply,
  onReply,
  onLongPress,
}: MessageReplySwipeOptions) {
  const [pullDistance, setPullDistance] = useState<number | null>(null);
  // A finger resting on the message on its way to the menu; a swipe, scroll or release lets go.
  const [pressed, setPressed] = useState(false);
  const distance = enabled && canReply ? (pullDistance ?? 0) : 0;
  const resistance = MAX_OFFSET - REPLY_DISTANCE;
  const extra = Math.max(0, distance - REPLY_DISTANCE);
  const offset =
    Math.min(distance, REPLY_DISTANCE) + resistance * (1 - Math.exp(-extra / resistance));

  const { onTouchStart, ...handlers } = useTouchGesture({
    enabled,
    resetKey: messageId,
    shouldStart: (event) => startsGesture(event.target),
    shouldLongPress: (event) => holdsForMenu(event.target),
    onLongPress: () => {
      selectionHaptic();
      onLongPress();
    },
    onSwipeProgress: (dx) => {
      setPressed(false);
      setPullDistance(canReply && dx < 0 ? -dx : null);
    },
    onSwipeEnd: () => {
      setPressed(false);
      setPullDistance(null);
    },
    onSwipeLeft: canReply ? onReply : undefined,
    swipeDistance: REPLY_DISTANCE,
    flickVelocity: 0.25,
    axisRatio: 1.1,
    directionSlop: 8,
  });

  function startTouch(event: TouchEvent<HTMLElement>) {
    onTouchStart(event);
    const holding =
      enabled &&
      event.touches.length === 1 &&
      startsGesture(event.target) &&
      holdsForMenu(event.target);
    if (holding) setPressed(true);
  }

  return {
    gesture: { ...handlers, onTouchStartCapture: startTouch },
    pressed,
    dragging: enabled && canReply && pullDistance !== null,
    offset,
    progress: Math.min(1, distance / REPLY_DISTANCE),
    ready: distance >= REPLY_DISTANCE,
  };
}
