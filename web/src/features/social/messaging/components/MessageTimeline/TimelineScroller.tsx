import { SWIPE_SETTLE_TRANSITION, useIsMobile } from '@ap-education/ui';
import { ArrowDownIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import { useConversation } from '@/features/social/conversation-scope/store';
import { RefreshOnPull } from '@/shared/ui/PullToRefresh/RefreshOnPull';

import { keyboardGlidePart } from '../../keyboard-glide-part';
import { MEDIA_MAX_SIDE } from '../../media/media-fit';
import { useDragDismissesKeyboard } from './useDragDismissesKeyboard';
import { useMobileMessageSelection } from './useMobileMessageSelection';
import type { useScrollAnchoring } from './useScrollAnchoring';

const useStyles = createStyles(({ token, css }) => ({
  viewport: css`
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  `,
  scroll: css`
    height: 100%;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overflow-anchor: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--chat-service-bg, ${token.colorBorder}) transparent;
    touch-action: pan-y pinch-zoom;
  `,
  feed: css`
    // Rows read these from their static CSS: the swipe's settle curve and the media box's side.
    --swipe-settle: ${SWIPE_SETTLE_TRANSITION};
    --media-max-side: ${MEDIA_MAX_SIDE}px;
    display: flex;
    flex-direction: column;
    // A short history should hug the bottom of the viewport like any chat app, not
    // leave empty space under the last message — the scroll-to-bottom effect in
    // useScrollAnchoring only sets scrollTop, which does nothing once content already
    // fits, so the layout itself has to push it down instead.
    justify-content: flex-end;
    min-height: 100%;
    // The pinned bar and the composer float over the history (see useOverlayInsets).
    padding: calc(var(--chat-inset-top, 0px) + ${token.paddingXS}px) 0
      calc(var(--chat-inset-bottom, 0px) + ${token.paddingXS}px);
  `,
  bottom: css`
    position: absolute;
    right: ${token.padding}px;
    bottom: calc(var(--chat-inset-bottom, 0px) + ${token.paddingSM}px);
    z-index: 3;
    display: grid;
    place-items: center;
    width: ${token.controlHeightLG}px;
    height: ${token.controlHeightLG}px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--glass, rgba(255, 255, 255, 0.86));
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    box-shadow: 0 1px 4px rgba(23, 46, 42, 0.18);
    color: ${token.colorTextSecondary};
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease;

    &:hover {
      color: ${token.colorText};
    }

    @media (max-width: ${token.screenMD}px) {
      right: ${token.paddingSM}px;
    }
  `,
  // Away-from-bottom while there's something new to catch up on reads differently from
  // just having scrolled up on your own — the same cue the unread divider uses.
  bottomUnread: css`
    background: ${token.colorPrimary};
    color: ${token.colorWhite};

    &:hover {
      color: ${token.colorWhite};
    }
  `,
}));

interface TimelineScrollerProps {
  anchoring: ReturnType<typeof useScrollAnchoring>;
  hasNewer: boolean;
  children: ReactNode;
}

/** The timeline's scrolling surface: dragging it puts the keyboard away, a button leads back down. */
export function TimelineScroller({ anchoring, hasNewer, children }: TimelineScrollerProps) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  const requestComposerBlur = useConversation((state) => state.requestComposerBlur);
  const selecting = useConversation((state) => state.selectedIds.length > 0);
  const dragDismissesKeyboard = useDragDismissesKeyboard(requestComposerBlur);
  const { scrollRef, onScroll, awayFromBottom, goDown } = anchoring;
  const downLabel = hasNewer ? 'До новіших повідомлень' : 'До низу розмови';
  useMobileMessageSelection(scrollRef, isMobile);

  return (
    <div className={cx(styles.viewport, keyboardGlidePart)}>
      <RefreshOnPull>
        <div
          ref={scrollRef}
          className={styles.scroll}
          onScroll={onScroll}
          {...dragDismissesKeyboard}
          role="log"
          aria-label="Повідомлення каналу"
          aria-live="off"
        >
          <div className={styles.feed} data-chat-inset data-selecting={selecting || undefined}>
            {children}
          </div>
        </div>
      </RefreshOnPull>
      {awayFromBottom && (
        <button
          type="button"
          className={cx(styles.bottom, hasNewer && styles.bottomUnread)}
          data-chat-inset
          onClick={goDown}
          aria-label={downLabel}
          title={downLabel}
        >
          <ArrowDownIcon size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
