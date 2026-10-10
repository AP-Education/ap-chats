import { SWIPE_SETTLE_TRANSITION } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import {
  type CSSProperties,
  type MouseEvent,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { ReplyIcon } from '@/features/social/conversation/actionIcons';
import { QuickReactions } from '@/features/social/reactions/components/QuickReactions/QuickReactions';
import { ReactionPicker } from '@/features/social/reactions/components/ReactionPicker/ReactionPicker';

import { groupMessageActions } from './messageActionGroups';
import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';
import { MessageActionSheet } from './MessageActionSheet';
import { useMessageReplySwipe } from './useMessageReplySwipe';

const useStyles = createStyles(({ token, css }) => ({
  // Nothing clips here: a swiped row slides off past the screen edge, and the selection
  // check sits outside the row in the run's gutter.
  gestureArea: css`
    position: relative;
    min-width: 0;

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
  const areaRef = useRef<HTMLDivElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  const available = scope.available(scope.messageTarget);
  const reply = available.find((action) => action.id === 'reply');
  const swipe = useMessageReplySwipe({
    messageId: scope.item.message.id,
    enabled: !scope.delivery && !scope.editing && !sheetOpen && !picking,
    canReply: !!reply,
    onLongPress: () => setSheetOpen(true),
    onReply: () => {
      if (reply) scope.onAction(reply, scope.messageTarget);
    },
  });
  useRunAvatarFollow(areaRef, swipe.offset, swipe.dragging);

  const closeSheet = () => setSheetOpen(false);
  const pickAnyReaction = () => {
    closeSheet();
    setPicking(true);
  };
  const openSheetFromContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    const inEditableField = (event.target as Element).closest(
      'input, textarea, select, [contenteditable="true"]',
    );
    if (scope.delivery || scope.editing || inEditableField) return;

    event.preventDefault();
    setSheetOpen(true);
  };
  const quickReactions = scope.canReact && (
    <QuickReactions
      item={scope.item}
      viewerMemberId={scope.context.memberId}
      variant="sheet"
      onPicked={closeSheet}
      onMore={pickAnyReaction}
    />
  );
  const swipeStyle = {
    '--message-swipe-offset': `${swipe.offset}px`,
    '--message-reply-progress': swipe.progress,
  } as CSSProperties;

  return (
    <>
      <div
        ref={areaRef}
        className={styles.gestureArea}
        data-swiping={swipe.dragging || undefined}
        data-reply-ready={swipe.ready || undefined}
        style={swipeStyle}
      >
        <span className={styles.replyHint} aria-hidden="true">
          <ReplyIcon size={20} />
        </span>
        <div
          {...rowProps}
          className={`${rowProps.className ?? ''} ${styles.touchTarget}`}
          data-message-readonly={!scope.editing || undefined}
          {...swipe.gesture}
          onContextMenu={openSheetFromContextMenu}
        >
          {children}
        </div>
      </div>

      {sheetOpen && (
        <MessageActionSheet
          open
          onClose={closeSheet}
          header={quickReactions}
          target={scope.messageTarget}
          groups={groupMessageActions(available)}
          onAction={scope.onAction}
        />
      )}
      {picking && (
        <ReactionPicker
          item={scope.item}
          viewerMemberId={scope.context.memberId}
          own={scope.isOwn}
          onClose={() => setPicking(false)}
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
