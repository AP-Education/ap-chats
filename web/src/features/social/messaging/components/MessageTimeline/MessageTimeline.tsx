import { ArrowDownIcon, ArrowUpIcon, HashIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button, Empty, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';
import { useReadReceipts } from '@/features/social/read-state/hooks/useReadReceipts';

import type { OutgoingMessage } from '../../hooks/useMessageOperations';
import type { HistoryItem, HistoryPage } from '../../types';
import { MessageRow } from '../MessageRow/MessageRow';

const useStyles = createStyles(({ token, css }) => ({
  scroll: css`
    position: relative;
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
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 11px;
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
  outgoing: css`
    align-self: flex-end;
    max-width: min(70%, 620px);
    margin: 6px 22px;
    padding: 9px 12px;
    border-radius: 12px 12px 3px 12px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorText};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    @media (max-width: ${token.screenMD}px) {
      max-width: 88%;
      margin-right: 12px;
    }
  `,
  outgoingStatus: css`
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    color: ${token.colorTextTertiary};
    font-size: 11px;
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
  const lastSeq = useRef<string | undefined>(undefined);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const items = useMemo(() => pages.flatMap((page) => page.items), [pages]);
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
    const currentLastSeq = items.at(-1)?.seq;
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
      container.scrollTop +=
        target.getBoundingClientRect().top - container.getBoundingClientRect().top - 90;
      setAwayFromBottom(true);
      atBottom.current = false;
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, [pages, items, firstUnreadSeq, targetMessageId]);

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
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 110;
    atBottom.current = nearBottom;
    setAwayFromBottom(!nearBottom);
    if (container.scrollTop < 90 && hasOlder && !loadingOlder) void older();
    if (nearBottom && hasNewer && !loadingNewer) void loadNewer();
  }

  function goDown() {
    if (hasNewer) {
      jumpAfterNext.current = true;
      void loadNewer();
    } else scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' });
  }

  const visibleOutbox = outbox.filter(
    (outgoing) => !items.some((item) => item.message.clientNonce === outgoing.input.clientNonce),
  );

  return (
    <div
      ref={scroll}
      className={styles.scroll}
      onScroll={onScroll}
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
        {!items.length && (
          <div className={styles.empty}>
            <Empty image={<HashIcon size={38} />} description="Тут почнеться розмова" />
          </div>
        )}
        {!items.length && <div className={styles.spacer} />}
        {items.map((item, index) => {
          const previous = items[index - 1];
          const day = new Date(item.createdAt).toDateString();
          const previousDay = previous ? new Date(previous.createdAt).toDateString() : null;
          const grouped = Boolean(
            previous &&
            previousDay === day &&
            previous.message.authorMemberId === item.message.authorMemberId &&
            new Date(item.createdAt).getTime() - new Date(previous.createdAt).getTime() < 300_000,
          );
          return (
            <div key={item.message.id}>
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
                highlighted={targetMessageId === item.message.id}
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
        {visibleOutbox.map((outgoing) => (
          <div key={outgoing.input.clientNonce} className={styles.outgoing}>
            {outgoing.input.markdown}
            <div className={styles.outgoingStatus}>
              {outgoing.status === 'sending' ? (
                <>
                  <Spin size="small" /> Надсилаємо…
                </>
              ) : (
                <>
                  <WarningCircleIcon size={14} /> Не надіслано{' '}
                  <Button
                    type="link"
                    size="small"
                    onClick={() => onRetry(outgoing.input.clientNonce)}
                  >
                    Повторити
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {awayFromBottom && (
        <button type="button" className={styles.bottom} onClick={goDown}>
          <ArrowDownIcon size={16} /> {hasNewer ? 'До новіших' : 'До низу'}
        </button>
      )}
    </div>
  );
}
