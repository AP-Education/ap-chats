import { ArrowBendUpLeftIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useRef, useState } from 'react';

import { SWIPE_SETTLE_TRANSITION, useTouchGesture } from '@/shared/hooks/useTouchGesture';

import { groupMessageActions } from './messageActionGroups';
import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';
import { MessageActionSheet } from './MessageActionSheet';

const useStyles = createStyles(({ token, css }) => ({
  gestureArea: css`
    position: relative;
    min-width: 0;
    overflow: hidden;
  `,
  touchTarget: css`
    touch-action: pan-y pinch-zoom;
    [data-message-text] {
      user-select: none;
      -webkit-touch-callout: none;
    }
    a,
    button {
      -webkit-touch-callout: default;
    }
  `,
  replyHint: css`
    position: absolute;
    top: 50%;
    right: 8px;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    opacity: 0;
    transform: translateY(-50%);
    pointer-events: none;
    transition:
      opacity 220ms ease-out,
      scale 220ms ease-out;
  `,
}));

const replyThreshold = 72;
const maxOffset = 56;

export function MessageTouchActions({ rowProps, children }: MessageActionsProps) {
  const { styles } = useStyles();
  const scope = useMessageActionScope();
  const [open, setOpen] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const replyHint = useRef<HTMLSpanElement>(null);
  const available = scope.available(scope.messageTarget);
  const reply = available.find((action) => action.id === 'reply');
  function setSwipeOffset(distance: number) {
    const target = row.current;
    const hint = replyHint.current;
    if (!target || !hint) return;
    const offset = Math.min(maxOffset, Math.max(0, -distance - 8) * 0.8);
    target.style.transition = 'none';
    hint.style.transition = 'none';
    target.style.transform = `translate3d(${-offset}px, 0, 0)`;
    hint.style.opacity = String(offset / maxOffset);
    hint.style.scale = distance <= -replyThreshold ? '1' : '0.85';
  }

  function resetSwipe() {
    const target = row.current;
    const hint = replyHint.current;
    if (!target || !hint) return;
    target.style.transition = SWIPE_SETTLE_TRANSITION;
    hint.style.transition = '';
    target.style.transform = 'translate3d(0, 0, 0)';
    hint.style.opacity = '0';
    hint.style.scale = '0.85';
  }

  const gesture = useTouchGesture({
    shouldStart: () => !scope.delivery && !scope.editing,
    onLongPress: () => setOpen(true),
    onSwipeProgress: (distance) => {
      if (reply && distance < 0) setSwipeOffset(distance);
    },
    onSwipeEnd: resetSwipe,
    onSwipeLeft: () => {
      if (!reply) return false;
      scope.onAction(reply, scope.messageTarget);
      return true;
    },
    swipeDistance: replyThreshold,
  });

  return (
    <>
      <div className={styles.gestureArea}>
        <span ref={replyHint} className={styles.replyHint} aria-hidden="true">
          <ArrowBendUpLeftIcon size={20} />
        </span>
        <div
          {...rowProps}
          ref={row}
          className={`${rowProps.className ?? ''} ${styles.touchTarget}`}
          {...gesture}
          onContextMenu={(event) => {
            event.preventDefault();
            if (!scope.delivery && !scope.editing) setOpen(true);
          }}
        >
          {children}
        </div>
      </div>
      {open && (
        <MessageActionSheet
          open={open}
          onClose={() => setOpen(false)}
          target={scope.messageTarget}
          groups={groupMessageActions(available)}
          onAction={scope.onAction}
        />
      )}
    </>
  );
}
