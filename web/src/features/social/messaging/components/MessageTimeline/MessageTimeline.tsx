import { ArrowDownIcon, ArrowUpIcon, HashIcon } from '@phosphor-icons/react';
import { Button, Empty } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';
import { useReadReceipts } from '@/features/social/read-state/hooks/useReadReceipts';

import { flashMessage } from '../../flashMessage';
import type { OutgoingMessage } from '../../hooks/useMessageOperations';
import type { HistoryItem, HistoryPage, MessageAuthor } from '../../types';
import { MessageRow } from '../MessageRow/MessageRow';

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
  `,
  feed: css`
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 16px 0 20px;
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
    font-size: 12px;
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
    font-size: 12px;
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
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 20px;
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowSecondary};
    color: ${token.colorText};
    cursor: pointer;
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
  workspaceId: string;
  channelId: string;
  pages: HistoryPage[];
  outbox: OutgoingMessage[];
  author: MessageAuthor;
  actionContext: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  onJump: (messageId: string) => void;
  onEdit: (item: HistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
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
  workspaceId,
  channelId,
  pages,
  outbox,
  author,
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
  const { styles } = useStyles();
  const scroll = useRef<HTMLDivElement>(null);
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const didPosition = useRef(false);
  const atBottom = useRef(true);
  const jumpAfterNext = useRef(false);
  const suppressOlderUntil = useRef(0);
  const lastScrollAt = useRef(0);
  const lastSeq = useRef<string | undefined>(undefined);
  const lastFlashedTarget = useRef<string | null>(null);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const items = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const displayItems = useMemo(() => {
    const pendingNonces = new Set(outbox.map((entry) => entry.input.clientNonce));
    const confirmed = items
      .filter((item) => !item.message.clientNonce || !pendingNonces.has(item.message.clientNonce))
      .map((item) => ({
        item,
        delivery: undefined as OutgoingMessage['status'] | undefined,
        nonce: null as string | null,
      }));
    const outgoing = outbox.map((entry) => {
      const replyTarget = items.find((item) => item.message.id === entry.input.replyToMessageId);
      const item: HistoryItem = entry.confirmedItem ?? {
        type: 'MESSAGE',
        seq: '0',
        createdAt: entry.createdAt,
        message: {
          id: entry.input.clientNonce,
          seq: '0',
          authorMemberId: author.memberId,
          clientNonce: entry.input.clientNonce,
          markdown: entry.input.markdown,
          contentVersion: 1,
          revision: 1,
          replyToMessageId: entry.input.replyToMessageId ?? null,
          quoteText: entry.input.quoteText ?? null,
          isForwarded: false,
          forwardedFromMemberId: null,
          createdAt: entry.createdAt,
          editedAt: null,
          deletedAt: null,
        },
        author,
        reply: replyTarget
          ? {
              id: replyTarget.message.id,
              authorMemberId: replyTarget.message.authorMemberId,
              author: replyTarget.author,
              markdown: replyTarget.message.markdown,
            }
          : null,
        forwardedFrom: null,
        pin: null,
      };
      return { item, delivery: entry.status, nonce: entry.input.clientNonce };
    });
    return [...confirmed, ...outgoing];
  }, [items, outbox, author]);
  const initial = pages.find((page) => page.firstUnreadSeq !== null) ?? pages[0];
  const firstUnreadSeq = initial?.firstUnreadSeq ?? null;
  const onVisible = useReadReceipts(
    workspaceId,
    channelId,
    items,
    firstUnreadSeq,
    initial?.readState ?? null,
    actionContext.memberId,
  );

  useLayoutEffect(() => {
    const container = scroll.current;
    if (!container) return;
    const currentLastSeq = displayItems.at(-1)?.nonce ?? items.at(-1)?.seq;
    if (prepend.current) {
      container.scrollTop = prepend.current.top + container.scrollHeight - prepend.current.height;
      prepend.current = null;
      lastSeq.current = currentLastSeq;
      return;
    }
    if (jumpAfterNext.current) {
      container.scrollTop = container.scrollHeight;
      jumpAfterNext.current = false;
      lastSeq.current = currentLastSeq;
      return;
    }
    if (didPosition.current) {
      if (currentLastSeq !== lastSeq.current && atBottom.current)
        container.scrollTop = container.scrollHeight;
      lastSeq.current = currentLastSeq;
      return;
    }
    if (!pages.length) return;
    didPosition.current = true;
    lastSeq.current = currentLastSeq;
    const target = targetMessageId
      ? document.getElementById(`message-${targetMessageId}`)
      : firstUnreadSeq
        ? container.querySelector<HTMLElement>(`[data-seq="${firstUnreadSeq}"]`)
        : null;
    if (target) {
      const top =
        container.scrollTop +
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        90;
      if (targetMessageId) {
        suppressOlderUntil.current = Date.now() + 800;
        container.scrollTo({ top, behavior: 'smooth' });
      } else {
        container.scrollTop = top;
      }
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 110;
      setAwayFromBottom(!nearBottom);
      atBottom.current = nearBottom;
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, [pages, items, displayItems, firstUnreadSeq, targetMessageId]);

  useEffect(() => {
    if (!targetMessageId) {
      lastFlashedTarget.current = null;
      return;
    }
    if (lastFlashedTarget.current === targetMessageId) return;
    if (!document.getElementById(`message-${targetMessageId}`)) return;
    lastFlashedTarget.current = targetMessageId;
    flashMessage(targetMessageId);
  }, [displayItems, targetMessageId]);

  useEffect(() => {
    const container = scroll.current;
    if (!container || !items.length) return;
    const checkVisible = () => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      const viewport = container.getBoundingClientRect();
      container.querySelectorAll<HTMLElement>('[data-seq]').forEach((row) => {
        const bounds = row.getBoundingClientRect();
        const visible =
          Math.min(bounds.bottom, viewport.bottom) - Math.max(bounds.top, viewport.top);
        if (visible >= Math.min(bounds.height, viewport.height) * 0.5 && row.dataset.seq)
          onVisible(row.dataset.seq);
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const seq = (entry.target as HTMLElement).dataset.seq;
            if (seq) onVisible(seq);
          }
        }
      },
      { root: container, threshold: 0.5 },
    );
    container.querySelectorAll('[data-seq]').forEach((row) => observer.observe(row));
    window.addEventListener('focus', checkVisible);
    document.addEventListener('visibilitychange', checkVisible);
    checkVisible();
    return () => {
      observer.disconnect();
      window.removeEventListener('focus', checkVisible);
      document.removeEventListener('visibilitychange', checkVisible);
    };
  }, [items, onVisible]);

  async function older() {
    const container = scroll.current;
    if (!container || loadingOlder || prepend.current) return;
    prepend.current = { height: container.scrollHeight, top: container.scrollTop };
    try {
      await loadOlder();
    } catch {
      prepend.current = null;
    }
  }

  function onScroll() {
    const container = scroll.current;
    if (!container) return;
    lastScrollAt.current = performance.now();
    container.dataset.hoverSuppressed = 'true';
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 110;
    atBottom.current = nearBottom;
    setAwayFromBottom(!nearBottom);
    if (
      container.scrollTop < 90 &&
      hasOlder &&
      !loadingOlder &&
      Date.now() > suppressOlderUntil.current
    )
      void older();
    if (nearBottom && hasNewer && !loadingNewer) void loadNewer();
  }

  function goDown() {
    if (hasNewer) {
      jumpAfterNext.current = true;
      void loadNewer();
    } else scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' });
  }

  return (
    <div className={styles.viewport}>
      <div
        ref={scroll}
        className={styles.scroll}
        onScroll={onScroll}
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
          {displayItems.map(({ item, delivery, nonce }, index) => {
            const previous = displayItems[index - 1]?.item;
            const day = new Date(item.createdAt).toDateString();
            const previousDay = previous ? new Date(previous.createdAt).toDateString() : null;
            const grouped = Boolean(
              previous &&
              previousDay === day &&
              previous.message.authorMemberId === item.message.authorMemberId &&
              new Date(item.createdAt).getTime() - new Date(previous.createdAt).getTime() < 300_000,
            );
            return (
              <div key={nonce ?? item.message.clientNonce ?? item.message.id}>
                {previousDay !== day && (
                  <div className={styles.date}>{dateFormat.format(new Date(item.createdAt))}</div>
                )}
                {firstUnreadSeq === item.seq && (
                  <div className={styles.unread}>Нові повідомлення</div>
                )}
                <MessageRow
                  item={item}
                  grouped={grouped}
                  actionContext={actionContext}
                  actions={actions}
                  onAction={onAction}
                  onJump={onJump}
                  onEdit={onEdit}
                  delivery={delivery}
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
          className={styles.bottom}
          onClick={goDown}
          aria-label={hasNewer ? 'До новіших повідомлень' : 'До низу розмови'}
          title={hasNewer ? 'До новіших повідомлень' : 'До низу розмови'}
        >
          <ArrowDownIcon size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
