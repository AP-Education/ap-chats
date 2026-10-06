import { useIsMobile } from '@ap/shell-ui';
import { ArrowDownIcon, ArrowUpIcon, HashIcon } from '@phosphor-icons/react';
import { Button, Empty } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo, useRef } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';
import { useConversation } from '@/features/social/conversation/store';

import type { DisplayItem, HistoryPage, MessageHistoryItem } from '../../types';
import { isMessageItem } from '../../types';
import { HistoryItemRow } from '../HistoryItemRow/HistoryItemRow';
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
    overflow-y: auto;
    overflow-anchor: auto;
    scrollbar-width: thin;
    scrollbar-color: ${token.colorBorder} transparent;
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
    padding: 16px 0 20px;

    & > [data-message-group-start] {
      margin-top: 10px;
    }
  `,
  spacer: css`
    flex: 1;
  `,
  load: css`
    align-self: center;
    margin: 4px 0 15px;
  `,
  date: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 13px 20px;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    white-space: nowrap;
    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: ${token.colorBorderSecondary};
    }
  `,
  unread: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 15px 20px 11px;
    color: ${token.colorPrimary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 700;
    white-space: nowrap;
    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: ${token.colorPrimaryBorder};
    }
  `,
  bottom: css`
    position: absolute;
    right: 22px;
    bottom: 14px;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(12px) saturate(180%);
    box-shadow: ${token.boxShadowSecondary};
    color: ${token.colorText};
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      border-color 0.15s ease;
  `,
  // Away-from-bottom while there's something new to catch up on reads differently from
  // just having scrolled up on your own — the same cue the unread divider uses.
  bottomUnread: css`
    border-color: ${token.colorPrimary};
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
  `,
  empty: css`
    display: grid;
    place-content: center;
    flex: 1;
    padding: 30px;
    text-align: center;
    color: ${token.colorTextSecondary};
  `,
}));

const dateFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

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
  // A deleted message keeps its seq (read state, scroll anchoring, and reply
  // excerpts elsewhere all still need it), but has nothing left worth a row —
  // Telegram just removes it rather than leaving a "message deleted" ghost.
  // Filtered only for what's rendered, so grouping recomputes around the gap
  // instead of orphaning the next real message from the same author.
  const visibleItems = useMemo(
    () => displayItems.filter(({ item }) => !isMessageItem(item) || item.message.markdown !== null),
    [displayItems],
  );
  const firstUnreadSeq = pages.find((page) => page.firstUnreadSeq !== null)?.firstUnreadSeq ?? null;

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
              icon={<ArrowUpIcon />}
              loading={loadingOlder}
              onClick={() => void older()}
            >
              Раніші повідомлення
            </Button>
          )}
          {!displayItems.length && (
            <div className={styles.empty}>
              <Empty image={<HashIcon size={38} />} description="Тут почнеться розмова" />
            </div>
          )}
          {!displayItems.length && <div className={styles.spacer} />}
          {visibleItems.map(({ item, delivery, nonce, pendingAttachments }, index) => {
            const previous = visibleItems[index - 1]?.item;
            const day = new Date(item.createdAt).toDateString();
            const previousDay = previous ? new Date(previous.createdAt).toDateString() : null;
            const grouped = Boolean(
              previous &&
              isMessageItem(previous) &&
              isMessageItem(item) &&
              previousDay === day &&
              previous.message.authorMemberId === item.message.authorMemberId &&
              new Date(item.createdAt).getTime() - new Date(previous.createdAt).getTime() < 300_000,
            );
            const key = isMessageItem(item)
              ? (nonce ?? item.message.clientNonce ?? item.id)
              : item.id;
            const groupStart = Boolean(
              !grouped &&
              previous &&
              isMessageItem(previous) &&
              isMessageItem(item) &&
              previousDay === day &&
              firstUnreadSeq !== item.seq,
            );
            return (
              <div key={key} data-message-group-start={groupStart || undefined}>
                {previousDay !== day && (
                  <div className={styles.date}>{dateFormat.format(new Date(item.createdAt))}</div>
                )}
                {firstUnreadSeq === item.seq && (
                  <div className={styles.unread}>Нові повідомлення</div>
                )}
                <HistoryItemRow
                  item={item}
                  grouped={grouped}
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
          {hasNewer && (
            <Button
              className={styles.load}
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
