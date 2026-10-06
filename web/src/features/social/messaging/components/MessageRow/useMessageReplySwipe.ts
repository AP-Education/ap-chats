import { useTouchGesture } from '@ap/shell-ui';
import { useState } from 'react';

import { selectionHaptic } from '@/shared/lib/haptics';

const REPLY_DISTANCE = 48;
const MAX_OFFSET = 64;

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
  const distance = enabled && canReply ? (pullDistance ?? 0) : 0;
  const resistance = MAX_OFFSET - REPLY_DISTANCE;
  const extra = Math.max(0, distance - REPLY_DISTANCE);
  const offset =
    Math.min(distance, REPLY_DISTANCE) + resistance * (1 - Math.exp(-extra / resistance));

  const { onTouchStart, ...handlers } = useTouchGesture({
    enabled,
    resetKey: messageId,
    shouldStart: (event) =>
      !(event.target as Element).closest(
        'input, textarea, select, [contenteditable="true"], [role="slider"], [data-swipe-ignore]',
      ),
    shouldLongPress: (event) => !(event.target as Element).closest('a, button'),
    onLongPress: () => {
      selectionHaptic();
      onLongPress();
    },
    onSwipeProgress: (dx) => setPullDistance(canReply && dx < 0 ? -dx : null),
    onSwipeEnd: () => setPullDistance(null),
    onSwipeLeft: canReply ? onReply : undefined,
    swipeDistance: REPLY_DISTANCE,
    flickVelocity: 0.25,
    axisRatio: 1.1,
    directionSlop: 8,
  });

  return {
    gesture: { ...handlers, onTouchStartCapture: onTouchStart },
    dragging: enabled && canReply && pullDistance !== null,
    offset,
    progress: Math.min(1, distance / REPLY_DISTANCE),
    ready: distance >= REPLY_DISTANCE,
  };
}
