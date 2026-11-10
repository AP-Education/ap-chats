import { TimelineEntry } from '@ap-education/timeline/react';
import { ActionSheet } from '@ap-education/ui/sheet';
import {
  type CSSProperties,
  type MouseEvent,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { extensionNamespaces } from '@/features/social/conversation-scope/extensions';
import { QuickReactions } from '@/features/social/reactions/components/QuickReactions/QuickReactions';
import { ReactionPicker } from '@/features/social/reactions/components/ReactionPicker/ReactionPicker';

import { ReplyIcon } from '../../actionIcons';
import { messageActionItems } from './messageActionItems';
import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';
import styles from './MessageTouchActions.module.css';
import { useMessageReplySwipe } from './useMessageReplySwipe';
import { useOwnMessageStatus } from './useOwnMessageStatus';

export function MessageTouchActions({ rowProps, children }: MessageActionsProps) {
  const { t } = useTranslation(extensionNamespaces);
  const scope = useMessageActionScope();
  const status = useOwnMessageStatus();
  const areaRef = useRef<HTMLDivElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  const available = scope.available(scope.messageTarget);
  const reply = available.find((action) => action.id === 'reply');
  const swipe = useMessageReplySwipe({
    messageId: scope.item.message.id,
    enabled: !scope.editing && !sheetOpen && !picking,
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
    if (scope.editing || inEditableField) return;

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
        data-pressed={swipe.pressed || undefined}
        data-reply-ready={swipe.ready || undefined}
        style={swipeStyle}
      >
        <span className={styles.replyHint} aria-hidden="true">
          <ReplyIcon size={20} />
        </span>
        <TimelineEntry asChild side={scope.isOwn ? 'end' : 'start'} status={status}>
          <div
            {...rowProps}
            className={`${rowProps.className ?? ''} ${styles.touchTarget}`}
            data-message-readonly={!scope.editing || undefined}
            {...swipe.gesture}
            onContextMenu={openSheetFromContextMenu}
          >
            {children}
          </div>
        </TimelineEntry>
      </div>

      {sheetOpen && (
        <ActionSheet
          open
          onClose={closeSheet}
          aria-label="Дії з повідомленням"
          groups={messageActionItems(available, scope.messageTarget, t)}
          onSelect={(id) => {
            const action = available.find((entry) => entry.id === id);
            if (action) scope.onAction(action, scope.messageTarget);
          }}
        >
          {quickReactions}
        </ActionSheet>
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
    if (!area || !run || run.querySelector('[data-timeline-run-entries] > :last-child') !== area) {
      return;
    }

    run.style.setProperty('--run-swipe-offset', `${offset}px`);
    run.toggleAttribute('data-swiping', dragging);
  }, [areaRef, offset, dragging]);
}
