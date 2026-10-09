import { createStyles } from 'antd-style';
import { memo, useLayoutEffect, useRef } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';
import { useConversation } from '@/features/social/conversation/store';

import type { AttachmentDraft } from '../../attachments/types';
import type { DeliveryStatus, MessageHistoryItem } from '../../types';
import { Bubble } from '../Bubble/Bubble';
import { bubbleLayout } from './bubbleLayout';
import { MessageActions } from './MessageActions';
import { MessageActionProvider } from './MessageActionScope';
import { MessageBody } from './MessageBody';
import { MessageHeader } from './MessageHeader';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: ${token.paddingXS}px;
    min-width: 0;
    color: ${token.colorText};

    &[data-own] {
      justify-content: flex-end;
    }
    // Keyboard focus rings the bubble, not the whole row.
    &:focus-visible {
      outline: none;
    }
    &:focus-visible [data-variant] {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
    &[data-flash] {
      animation: flash 0.85s ease-out;
    }
    @keyframes flash {
      35% {
        background: color-mix(in srgb, ${token.colorPrimary} 22%, transparent);
      }
      100% {
        background: transparent;
      }
    }
  `,
  selected: css`
    background: color-mix(in srgb, ${token.colorPrimary} 14%, transparent);
  `,
  sending: css`
    [data-message-text] {
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
  confirmed: css`
    animation: confirmed 0.9s ease-out;
    @keyframes confirmed {
      30% {
        background: color-mix(in srgb, ${token.colorPrimary} 12%, transparent);
      }
      100% {
        background: transparent;
      }
    }
  `,
  retry: css`
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--bubble-meta);
    font-size: ${token.fontSizeSM}px;
  `,
  retryButton: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--bubble-link);
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  `,
  checkbox: css`
    align-self: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    accent-color: ${token.colorPrimary};

    [data-own] > & {
      margin-right: auto;
    }
  `,
}));

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

interface MessageRowProps {
  item: MessageHistoryItem;
  actionContext: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  onJump: (messageId: string) => void;
  onEdit: (item: MessageHistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  delivery?: DeliveryStatus;
  pendingAttachments?: AttachmentDraft[];
  onRetry: (rowId: string) => void;
}

export const MessageRow = memo(function MessageRow({
  item,
  actionContext,
  actions,
  onAction,
  onJump,
  onEdit,
  delivery,
  pendingAttachments,
  onRetry,
}: MessageRowProps) {
  const { styles, cx } = useStyles();
  const authorName = item.author.displayName ?? 'Ім’я недоступне';
  const isOwnMessage = item.message.authorMemberId === actionContext.memberId;
  const mentionsMe = !isOwnMessage && Boolean(item.mentionsMe);
  const isReplyToMe = !isOwnMessage && item.reply?.authorMemberId === actionContext.memberId;
  const highlighted = mentionsMe || isReplyToMe;
  const isSelected = useConversation((state) => state.selectedIds.includes(item.message.id));
  const hasSelection = useConversation((state) => state.selectedIds.length > 0);
  const toggleSelected = useConversation((state) => state.toggleSelected);
  const editing = useConversation((state) => state.editingId === item.message.id);
  const setEditingId = useConversation((state) => state.setEditingId);
  const layout = bubbleLayout(item, pendingAttachments, editing);
  const tone = delivery === 'failed' ? 'failed' : highlighted ? 'attention' : undefined;
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
        pendingAttachments,
      }}
    >
      <MessageActions
        rowProps={{
          id: `message-${item.message.id}`,
          'data-seq': delivery ? undefined : item.seq,
          'data-own': isOwnMessage || undefined,
          'data-selected': isSelected || undefined,
          'data-failed': delivery === 'failed' || undefined,
          'data-mentions-me': highlighted || undefined,
          tabIndex: delivery ? -1 : 0,
          'aria-label': `Повідомлення від ${authorName}, ${timeFormat.format(new Date(item.message.createdAt))}`,
          className: cx(
            styles.row,
            isSelected && styles.selected,
            (delivery === 'sending' || delivery === 'uploading') && styles.sending,
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
        <Bubble own={isOwnMessage} variant={layout.variant} tone={tone} wide={editing}>
          <MessageHeader onJump={onJump} />
          <MessageBody
            layout={layout}
            contentRef={contentRef}
            minHeight={contentHeight.current}
            onEdit={onEdit}
            onCloseEdit={() => setEditingId(null)}
          />
          {delivery === 'failed' && (
            <div className={styles.retry}>
              Не надіслано
              <button type="button" className={styles.retryButton} onClick={() => onRetry(item.id)}>
                Повторити
              </button>
            </div>
          )}
        </Bubble>
      </MessageActions>
    </MessageActionProvider>
  );
});
