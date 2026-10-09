import { SWIPE_SETTLE_TRANSITION } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from 'react';

import { ReplyIcon } from '@/features/social/conversation/actionIcons';

import { groupMessageActions } from './messageActionGroups';
import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';
import { MessageActionSheet } from './MessageActionSheet';
import { useMessageReplySwipe } from './useMessageReplySwipe';

const useStyles = createStyles(({ token, css }) => ({
  gestureArea: css`
    position: relative;
    min-width: 0;
    overflow: hidden;

    &[data-swiping] > div,
    &[data-swiping] > span {
      transition: none;
    }
  `,
  // The whole row follows the finger, as in Telegram. A 2D translate keeps the resting
  // rows off their own compositing layers.
  touchTarget: css`
    touch-action: pan-y pinch-zoom;
    transform: translateX(calc(-1 * var(--message-swipe-offset, 0px)));
    transition: ${SWIPE_SETTLE_TRANSITION};
    &[data-message-readonly],
    &[data-message-readonly] [data-message-text] {
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    a,
    button {
      -webkit-touch-callout: default;
    }
    input,
    textarea,
    [contenteditable='true'] {
      user-select: text;
      -webkit-user-select: text;
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
    color: ${token.colorPrimaryTextActive};
    opacity: var(--message-reply-progress, 0);
    transform: translateY(-50%);
    scale: 0.85;
    pointer-events: none;
    transition:
      opacity 220ms ease-out,
      scale 220ms ease-out;

    [data-reply-ready] > & {
      scale: 1;
    }
  `,
}));

export function MessageTouchActions({ rowProps, children }: MessageActionsProps) {
  const { styles } = useStyles();
  const scope = useMessageActionScope();
  const [open, setOpen] = useState(false);
  const available = scope.available(scope.messageTarget);
  const reply = available.find((action) => action.id === 'reply');
  const areaRef = useRef<HTMLDivElement>(null);
  const swipe = useMessageReplySwipe({
    messageId: scope.item.message.id,
    enabled: !scope.delivery && !scope.editing && !open,
    canReply: !!reply,
    onLongPress: () => setOpen(true),
    onReply: () => {
      if (!reply) return;
      scope.onAction(reply, scope.messageTarget);
    },
  });

  useRunAvatarFollow(areaRef, swipe.offset, swipe.dragging);

  return (
    <>
      <div
        ref={areaRef}
        className={styles.gestureArea}
        data-swiping={swipe.dragging || undefined}
        data-reply-ready={swipe.ready || undefined}
        style={
          {
            '--message-swipe-offset': `${swipe.offset}px`,
            '--message-reply-progress': swipe.progress,
          } as CSSProperties
        }
      >
        <span className={styles.replyHint} aria-hidden="true">
          <ReplyIcon size={20} />
        </span>
        <div
          {...rowProps}
          className={`${rowProps.className ?? ''} ${styles.touchTarget}`}
          data-message-readonly={!scope.editing || undefined}
          {...swipe.gesture}
          onContextMenu={(event) => {
            if (
              scope.delivery ||
              scope.editing ||
              (event.target as Element).closest('input, textarea, select, [contenteditable="true"]')
            )
              return;
            event.preventDefault();
            setOpen(true);
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

/** The run's avatar sits beside its last row, so it moves along when that row is swiped. */
function useRunAvatarFollow(
  areaRef: RefObject<HTMLDivElement | null>,
  offset: number,
  dragging: boolean,
) {
  useLayoutEffect(() => {
    const area = areaRef.current;
    const run = area?.closest<HTMLElement>('[data-history-run]');
    if (!area || !run || run.querySelector('[data-run-entries] > :last-child') !== area) return;

    run.style.setProperty('--run-swipe-offset', `${offset}px`);
    run.toggleAttribute('data-swiping', dragging);
  }, [areaRef, offset, dragging]);
}
