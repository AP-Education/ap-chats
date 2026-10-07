import { ArrowDownIcon, ArrowUpIcon, ChatsCircleIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo, useRef } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';
import { useConversation } from '@/features/social/conversation/store';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

import type { DisplayItem, HistoryPage, MessageHistoryItem } from '../../types';
import { isMessageItem } from '../../types';
import { HistoryItemRow } from '../HistoryItemRow/HistoryItemRow';
import { buildTimelineDays, formatDayLabel } from './timeline-days';
import { useMobileMessageSelection } from './useMobileMessageSelection';
import { useScrollAnchoring } from './useScrollAnchoring';

const useStyles = createStyles(({ token, css }) => ({
  viewport: css`
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  `,
  scroll: css`
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overflow-anchor: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--chat-service-bg, ${token.colorBorder}) transparent;
    touch-action: pan-y pinch-zoom;
  `,
  feed: css`
    display: flex;
    flex-direction: column;
    // A short history should hug the bottom of the viewport like any chat app, not
    // leave empty space under the last message — the scroll-to-bottom effect in
    // useScrollAnchoring only sets scrollTop, which does nothing once content already
    // fits, so the layout itself has to push it down instead.
    justify-content: flex-end;
    min-height: 100%;
    // The pinned bar and the composer float over the history (see useOverlayInsets).
    padding: calc(var(--chat-inset-top, 0px) + 8px) 0 calc(var(--chat-inset-bottom, 0px) + 10px);
  `,
  day: css`
    display: flex;
    flex-direction: column;
  `,
  entry: css`
    & + &[data-group-start] {
      margin-top: 8px;
    }
  `,
  dateBar: css`
    position: sticky;
    top: calc(var(--chat-inset-top, 0px) + 8px);
    z-index: 2;
    display: flex;
    justify-content: center;
    margin: 8px 0 10px;
    pointer-events: none;
  `,
  pill: css`
    padding: 3px 11px;
    border-radius: 13px;
    background: var(--chat-service-bg, rgba(0, 0, 0, 0.32));
    backdrop-filter: blur(12px) saturate(1.4);
    color: ${token.colorWhite};
    font-size: 13px;
    line-height: 20px;
    font-weight: 600;
    white-space: nowrap;
  `,
  load: css`
    align-self: center;
    margin: 4px 0 12px;
  `,
  unread: css`
    margin: 10px 0 12px;
    padding: 3px 0;
    background: var(--chat-service-bg, rgba(0, 0, 0, 0.32));
    backdrop-filter: blur(12px) saturate(1.4);
    color: ${token.colorWhite};
    font-size: 13px;
    line-height: 20px;
    font-weight: 650;
    text-align: center;
  `,
  bottom: css`
    position: absolute;
    right: 16px;
    bottom: calc(var(--chat-inset-bottom, 0px) + 12px);
    z-index: 3;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.86);
    backdrop-filter: blur(16px) saturate(1.6);
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
      right: 12px;
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
  empty: css`
    display: grid;
    place-content: center;
    flex: 1;
    padding: 30px;
  `,
  emptyCard: css`
    display: grid;
    justify-items: center;
    gap: 8px;
    max-width: 260px;
    padding: 18px 22px;
    border-radius: 18px;
    background: var(--chat-service-bg, rgba(0, 0, 0, 0.32));
    backdrop-filter: blur(12px) saturate(1.4);
    color: ${token.colorWhite};
    font-weight: 600;
    text-align: center;
  `,
}));

interface MessageTimelineProps {
  pages: HistoryPage[];
  displayItems: DisplayItem[];
  actionContext: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  onJump: (messageId: string) => void;
  onEdit: (item: MessageHistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  onRetry: (nonce: string) => void;
  hasOlder: boolean;
  hasNewer: boolean;
  loadingOlder: boolean;
  loadingNewer: boolean;
  loadOlder: () => Promise<unknown>;
  loadNewer: () => Promise<unknown>;
  targetMessageId?: string;
}

export function MessageTimeline({
  pages,
  displayItems,
  actionContext,
  actions,
  onAction,
  onJump,
  onEdit,
  onRetry,
  hasOlder,
  hasNewer,
  loadingOlder,
  loadingNewer,
  loadOlder,
  loadNewer,
  targetMessageId,
}: MessageTimelineProps) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  const requestComposerBlur = useConversation((state) => state.requestComposerBlur);
  const gesture = useRef<{ x: number; y: number; dismissed: boolean } | null>(null);
  const items = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const firstUnreadSeq = pages.find((page) => page.firstUnreadSeq !== null)?.firstUnreadSeq ?? null;
  // A deleted message keeps its seq (read state, scroll anchoring, and reply
  // excerpts elsewhere all still need it), but has nothing left worth a row —
  // Telegram just removes it rather than leaving a "message deleted" ghost.
  // Filtered only for what's rendered, so grouping recomputes around the gap
  // instead of orphaning the next real message from the same author.
  const days = useMemo(
    () =>
      buildTimelineDays(
        displayItems.filter(({ item }) => !isMessageItem(item) || item.message.markdown !== null),
        firstUnreadSeq,
      ),
    [displayItems, firstUnreadSeq],
  );

  const { scrollRef, awayFromBottom, lastScrollAt, onScroll, older, goDown } = useScrollAnchoring({
    pages,
    items,
    displayItems,
    firstUnreadSeq,
    targetMessageId,
    hasOlder,
    loadingOlder,
    hasNewer,
    loadingNewer,
    loadOlder,
    loadNewer,
  });
  useMobileMessageSelection(scrollRef, isMobile);

  return (
    <div className={styles.viewport}>
      <div
        ref={scrollRef}
        className={styles.scroll}
        onScroll={onScroll}
        onPointerDown={(event) => {
          if (event.pointerType === 'touch')
            gesture.current = { x: event.clientX, y: event.clientY, dismissed: false };
        }}
        onPointerUp={() => {
          gesture.current = null;
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          const start = gesture.current;
          if (!touch || !start || start.dismissed) return;
          const vertical = Math.abs(touch.clientY - start.y);
          if (vertical > 10 && vertical > Math.abs(touch.clientX - start.x)) {
            start.dismissed = true;
            requestComposerBlur();
          }
        }}
        onPointerMove={(event) => {
          if (performance.now() - lastScrollAt.current > 120)
            delete event.currentTarget.dataset.hoverSuppressed;
        }}
        onPointerLeave={(event) => delete event.currentTarget.dataset.hoverSuppressed}
        role="log"
        aria-label="Повідомлення каналу"
        aria-live="off"
      >
        <div className={styles.feed}>
          {hasOlder && (
            <Button
              className={styles.load}
              shape="round"
              icon={<ArrowUpIcon />}
              loading={loadingOlder}
              onClick={() => void older()}
            >
              Раніші повідомлення
            </Button>
          )}
          {!displayItems.length && (
            <div className={styles.empty}>
              <div className={styles.emptyCard}>
                <ChatsCircleIcon size={36} weight="duotone" aria-hidden />
                Тут почнеться розмова
              </div>
            </div>
          )}
          {days.map((day) => (
            <section key={day.key} className={styles.day} aria-label={formatDayLabel(day.date)}>
              <div className={styles.dateBar}>
                <span className={styles.pill}>{formatDayLabel(day.date)}</span>
              </div>
              {day.entries.map(({ key, display, unreadBefore, groupStart, groupEnd }) => {
                const { item, delivery, nonce, pendingAttachments } = display;
                return (
                  <div
                    key={key}
                    className={styles.entry}
                    data-group-start={groupStart || undefined}
                  >
                    {unreadBefore && <div className={styles.unread}>Нові повідомлення</div>}
                    <HistoryItemRow
                      item={item}
                      groupStart={groupStart}
                      groupEnd={groupEnd}
                      actionContext={actionContext}
                      actions={actions}
                      onAction={onAction}
                      onJump={onJump}
                      onEdit={onEdit}
                      delivery={delivery}
                      pendingAttachments={pendingAttachments}
                      onRetry={nonce ? () => onRetry(nonce) : undefined}
                    />
                  </div>
                );
              })}
            </section>
          ))}
          {hasNewer && (
            <Button
              className={styles.load}
              shape="round"
              icon={<ArrowDownIcon />}
              loading={loadingNewer}
              onClick={() => void loadNewer()}
            >
              Новіші повідомлення
            </Button>
          )}
        </div>
      </div>
      {awayFromBottom && (
        <button
          type="button"
          className={cx(styles.bottom, hasNewer && styles.bottomUnread)}
          onClick={goDown}
          aria-label={hasNewer ? 'До новіших повідомлень' : 'До низу розмови'}
          title={hasNewer ? 'До новіших повідомлень' : 'До низу розмови'}
        >
          <ArrowDownIcon size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
