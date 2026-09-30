import { ArrowBendUpRightIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useLayoutEffect, useRef } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';
import { useConversation } from '@/features/social/conversation/store';
import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';
import { Avatar } from '@/shared/ui/Avatar/Avatar';

import type { MessageHistoryItem } from '../../types';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { MessageActions } from './MessageActions';
import { MessageActionProvider } from './MessageActionScope';
import { MessageBody } from './MessageBody';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    position: relative;
    display: flex;
    gap: 12px;
    min-width: 0;
    padding: 5px 24px 5px 20px;
    color: ${token.colorText};
    &:hover {
      background: ${token.colorFillQuaternary};
    }
    [data-hover-suppressed]
      &:hover:not([data-selected]):not([data-failed]):not([data-mentions-me]) {
      background: transparent;
    }
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
    &[data-flash] {
      animation: flash 0.85s ease-out;
    }
    @keyframes flash {
      35% {
        background: ${token.colorPrimaryBgHover};
      }
      100% {
        background: transparent;
      }
    }
    &:hover [data-message-actions],
    &:focus-visible [data-message-actions],
    &:not(:focus):focus-within [data-message-actions] {
      opacity: 1;
      pointer-events: auto;
    }
    [data-hover-suppressed] &:hover:not(:focus-within) [data-message-actions] {
      opacity: 0;
      pointer-events: none;
    }
    @media (max-width: ${token.screenMD}px) {
      gap: 8px;
      padding: 6px 12px;
    }
  `,
  selected: css`
    background: ${token.colorPrimaryBg};
  `,
  sending: css`
    [data-message-text] {
      color: ${token.colorTextTertiary};
      animation: appear 0.2s ease-out;
    }
    @keyframes appear {
      from {
        opacity: 0.35;
      }
      to {
        opacity: 1;
      }
    }
  `,
  failed: css`
    background: ${token.colorErrorBg};
    &:hover,
    &:focus-within {
      background: ${token.colorErrorBgHover};
    }
    [data-message-text] {
      color: ${token.colorErrorText};
    }
  `,
  confirmed: css`
    animation: confirmed 0.9s ease-out;
    @keyframes confirmed {
      30% {
        background: ${token.colorPrimaryBg};
      }
      100% {
        background: transparent;
      }
    }
  `,
  highlighted: css`
    background: rgba(250, 173, 20, 0.08);
    border-left: 3px solid #faad14;
    padding-left: 17px;

    &:hover {
      background: rgba(250, 173, 20, 0.14);
    }

    @media (max-width: ${token.screenMD}px) {
      padding-left: 9px;
    }
  `,
  avatar: css`
    width: 44px;
    flex: 0 0 44px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 2px;
  `,
  avatarTrigger: css`
    display: inline-flex;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,
  content: css`
    flex: 1;
    min-width: 0;
    max-width: 880px;
    overflow-wrap: anywhere;
  `,
  heading: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 2px;
  `,
  author: css`
    font-size: 16px;
    line-height: 24px;
    font-weight: 650;
    color: ${token.colorText};
  `,
  authorTrigger: css`
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  `,
  time: css`
    color: ${token.colorTextTertiary};
    font-size: 12px;
  `,
  edited: css`
    color: ${token.colorTextQuaternary};
    font-size: 12px;
  `,
  reply: css`
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin: 2px 0 4px;
    padding: 4px 8px;
    overflow: hidden;
    border: 0;
    border-left: 3px solid ${token.colorPrimary};
    border-radius: 2px;
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    text-align: left;
    cursor: pointer;
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  forwarded: css`
    display: flex;
    align-items: center;
    gap: 3px;
    margin-bottom: 2px;
    color: ${token.colorPrimary};
    font-size: 14px;
    line-height: 18px;
  `,
  forwardedName: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  `,
  delivery: css`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
  retry: css`
    && {
      padding-inline: 2px;
      height: auto;
      font-size: ${token.fontSizeSM}px;
      line-height: 1.3;
    }
  `,
  checkbox: css`
    align-self: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    accent-color: ${token.colorPrimary};
  `,
}));

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

interface MessageRowProps {
  item: MessageHistoryItem;
  grouped: boolean;
  actionContext: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  onJump: (messageId: string) => void;
  onEdit: (item: MessageHistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  delivery?: 'sending' | 'failed' | 'confirmed';
  onRetry?: () => void;
}

export const MessageRow = memo(function MessageRow({
  item,
  grouped,
  actionContext,
  actions,
  onAction,
  onJump,
  onEdit,
  delivery,
  onRetry,
}: MessageRowProps) {
  const { styles, cx } = useStyles();
  const authorName = item.author.displayName ?? 'Ім’я недоступне';
  const replyAuthorName = item.reply?.author?.displayName ?? 'Ім’я недоступне';
  const forwardAuthorName = item.forwardedFrom?.displayName ?? 'Ім’я недоступне';
  const isOwnMessage = item.message.authorMemberId === actionContext.memberId;
  const mentionsMe =
    !isOwnMessage &&
    (item.mentions?.some((mention) => mention.memberId === actionContext.memberId) ?? false);
  const isReplyToMe = !isOwnMessage && item.reply?.authorMemberId === actionContext.memberId;
  const highlighted = mentionsMe || isReplyToMe;
  const isSelected = useConversation((state) => state.selectedIds.includes(item.message.id));
  const hasSelection = useConversation((state) => state.selectedIds.length > 0);
  const toggleSelected = useConversation((state) => state.toggleSelected);
  const editing = useConversation((state) => state.editingId === item.message.id);
  const setEditingId = useConversation((state) => state.setEditingId);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentHeight = useRef(40);
  useLayoutEffect(() => {
    if (!editing && contentRef.current) contentHeight.current = contentRef.current.offsetHeight;
  }, [editing, item.message.markdown]);

  return (
    <MessageActionProvider
      contentRef={contentRef}
      value={{
        item,
        author: authorName,
        context: actionContext,
        actions,
        onAction,
        editing,
        delivery,
      }}
    >
      <MessageActions
        rowProps={{
          id: `message-${item.message.id}`,
          'data-seq': delivery ? undefined : item.seq,
          'data-selected': isSelected || undefined,
          'data-failed': delivery === 'failed' || undefined,
          'data-mentions-me': highlighted || undefined,
          tabIndex: delivery ? -1 : 0,
          'aria-label': `Повідомлення від ${authorName}, ${timeFormat.format(new Date(item.message.createdAt))}`,
          className: cx(
            styles.row,
            isSelected && styles.selected,
            highlighted && styles.highlighted,
            delivery === 'sending' && styles.sending,
            delivery === 'failed' && styles.failed,
            delivery === 'confirmed' && styles.confirmed,
          ),
          onClick: (event) => {
            if (!hasSelection || window.getSelection()?.toString()) return;
            if ((event.target as Element).closest('button, a, input, textarea')) return;
            toggleSelected(item.message.id);
          },
          onKeyDown: (event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              const rows = [
                ...(event.currentTarget
                  .closest('[role="log"]')
                  ?.querySelectorAll<HTMLElement>('[data-seq]') ?? []),
              ];
              const offset = event.key === 'ArrowUp' ? -1 : 1;
              rows[rows.indexOf(event.currentTarget) + offset]?.focus();
              event.preventDefault();
            }
            if (event.key === ' ' && hasSelection) {
              event.preventDefault();
              toggleSelected(item.message.id);
            }
          },
        }}
      >
        {hasSelection && (
          <input
            type="checkbox"
            className={styles.checkbox}
            aria-label={`Вибрати повідомлення ${authorName}`}
            checked={isSelected}
            onChange={() => toggleSelected(item.message.id)}
          />
        )}
        <div className={styles.avatar}>
          {!grouped && (
            <MemberPopover member={item.author}>
              <button
                type="button"
                className={styles.avatarTrigger}
                aria-label={`Профіль ${authorName}`}
              >
                <Avatar path={item.author.avatarPath} alt={authorName} size={44} shape="circle" />
              </button>
            </MemberPopover>
          )}
        </div>
        <div className={styles.content}>
          {!grouped && (
            <div className={styles.heading}>
              <MemberPopover member={item.author}>
                <button type="button" className={cx(styles.author, styles.authorTrigger)}>
                  {authorName}
                </button>
              </MemberPopover>
              <time className={styles.time} dateTime={item.message.createdAt}>
                {timeFormat.format(new Date(item.message.createdAt))}
              </time>
              {item.message.editedAt && <span className={styles.edited}>ред.</span>}
            </div>
          )}
          {item.message.isForwarded && (
            <div className={styles.forwarded}>
              <ArrowBendUpRightIcon size={14} aria-hidden />
              <span>
                Переслано від{' '}
                {item.forwardedFrom ? (
                  <MemberPopover member={item.forwardedFrom}>
                    <button type="button" className={styles.forwardedName}>
                      {forwardAuthorName}
                    </button>
                  </MemberPopover>
                ) : (
                  forwardAuthorName
                )}
              </span>
            </div>
          )}
          {item.reply && (
            <button type="button" className={styles.reply} onClick={() => onJump(item.reply!.id)}>
              <ReplyExcerpt
                title={replyAuthorName}
                markdown={item.reply.markdown}
                quoteText={item.message.quoteText}
              />
            </button>
          )}
          <MessageBody
            contentRef={contentRef}
            minHeight={contentHeight.current}
            onEdit={onEdit}
            onCloseEdit={() => setEditingId(null)}
          />
          {delivery === 'failed' && (
            <div className={styles.delivery}>
              <WarningCircleIcon size={14} /> Не надіслано
              <Button type="link" size="small" className={styles.retry} onClick={onRetry}>
                Повторити
              </Button>
            </div>
          )}
        </div>
      </MessageActions>
    </MessageActionProvider>
  );
});
