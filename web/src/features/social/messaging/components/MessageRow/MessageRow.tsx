import { memo, useLayoutEffect, useRef } from 'react';

import { useConversation } from '@/features/social/conversation-scope/store';

import type { AttachmentDraft } from '../../attachments/types';
import { useTimelineActions } from '../../timeline-actions-context';
import type { DeliveryStatus, MessageHistoryItem } from '../../types';
import { Bubble } from '../Bubble/Bubble';
import { bubbleLayout } from './bubbleLayout';
import { MessageActions } from './MessageActions';
import { MessageActionProvider } from './MessageActionScope';
import { MessageBody } from './MessageBody';
import { MessageHeader } from './MessageHeader';
import styles from './MessageRow.module.css';
import { UnsentNotice } from './UnsentNotice';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

interface MessageRowProps {
  item: MessageHistoryItem;
  delivery?: DeliveryStatus;
  pendingAttachments?: AttachmentDraft[];
}

export const MessageRow = memo(function MessageRow({
  item,
  delivery,
  pendingAttachments,
}: MessageRowProps) {
  const { viewer } = useTimelineActions();
  const authorName = item.author.displayName ?? 'Ім’я недоступне';
  const isOwnMessage = item.message.authorMemberId === viewer.memberId;
  const mentionsMe = !isOwnMessage && Boolean(item.mentionsMe);
  const isReplyToMe = !isOwnMessage && item.reply?.authorMemberId === viewer.memberId;
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
          'data-sending': delivery === 'sending' || delivery === 'uploading' || undefined,
          tabIndex: delivery ? -1 : 0,
          'aria-label': `Повідомлення від ${authorName}, ${timeFormat.format(new Date(item.message.createdAt))}`,
          className: styles.row,
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
          <MessageHeader />
          <MessageBody
            layout={layout}
            contentRef={contentRef}
            minHeight={contentHeight.current}
            onCloseEdit={() => setEditingId(null)}
          />
          {delivery === 'failed' && <UnsentNotice rowId={item.id} />}
        </Bubble>
      </MessageActions>
    </MessageActionProvider>
  );
});
