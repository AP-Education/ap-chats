import { CheckIcon, DotsThreeIcon, QuotesIcon, XIcon } from '@phosphor-icons/react';
import { Dropdown, message as toast, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';
import { useConversation } from '@/features/social/conversation/store';
import { ApiError } from '@/shared/api/http';
import { Avatar } from '@/shared/ui/Avatar/Avatar';

import type { HistoryItem } from '../../types';
import { MessagePreview } from '../MessagePreview/MessagePreview';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    position: relative;
    display: flex;
    gap: 12px;
    min-width: 0;
    padding: 5px 24px 5px 20px;
    color: ${token.colorText};
    &:hover,
    &:focus-within {
      background: ${token.colorFillQuaternary};
    }
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
    &:hover [data-message-actions],
    &:focus-within [data-message-actions] {
      opacity: 1;
      pointer-events: auto;
    }
    @media (max-width: ${token.screenMD}px) {
      gap: 9px;
      padding: 6px 12px;
    }
  `,
  selected: css`
    background: ${token.colorPrimaryBg};
  `,
  highlighted: css`
    animation: highlight 1.6s ease-out;
    @keyframes highlight {
      from {
        background: ${token.colorPrimaryBgHover};
      }
      to {
        background: transparent;
      }
    }
  `,
  avatar: css`
    width: 36px;
    flex: 0 0 36px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 2px;
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
    font-weight: 650;
    color: ${token.colorText};
  `,
  time: css`
    color: ${token.colorTextTertiary};
    font-size: 11px;
  `,
  edited: css`
    color: ${token.colorTextQuaternary};
    font-size: 11px;
  `,
  reply: css`
    display: block;
    max-width: 100%;
    margin: 2px 0 5px;
    padding: 4px 9px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border: 0;
    border-left: 3px solid ${token.colorPrimary};
    border-radius: 5px;
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    text-align: left;
    cursor: pointer;
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  forwarded: css`
    margin-bottom: 3px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  markdown: css`
    line-height: 1.5;
    user-select: text;
    p {
      margin: 0 0 5px;
    }
    p:last-child {
      margin-bottom: 0;
    }
    pre {
      overflow-x: auto;
      padding: 9px 11px;
      border-radius: 7px;
      background: ${token.colorFillTertiary};
    }
    code {
      padding: 1px 3px;
      border-radius: 3px;
      background: ${token.colorFillTertiary};
      font-size: 0.92em;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    blockquote {
      margin: 5px 0;
      padding-left: 9px;
      border-left: 3px solid ${token.colorBorder};
      color: ${token.colorTextSecondary};
    }
    ul,
    ol {
      margin: 5px 0;
      padding-left: 21px;
    }
    a {
      color: ${token.colorLink};
    }
  `,
  deleted: css`
    color: ${token.colorTextQuaternary};
    font-style: italic;
  `,
  toolbar: css`
    position: absolute;
    z-index: 2;
    top: -16px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 3px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 9px;
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowSecondary};
    opacity: 0;
    pointer-events: none;
    @media (hover: none) {
      opacity: 1;
      pointer-events: auto;
    }
    @media (max-width: ${token.screenMD}px) {
      right: 10px;
    }
  `,
  tool: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 29px;
    height: 28px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
  checkbox: css`
    align-self: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    accent-color: ${token.colorPrimary};
  `,
  editBox: css`
    width: 100%;
    min-height: 80px;
    padding: 8px;
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: 7px;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    font: inherit;
    resize: vertical;
  `,
  editActions: css`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 5px;
  `,
  conflict: css`
    margin-top: 6px;
    color: ${token.colorWarningText};
    font-size: 12px;
  `,
}));

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

function MessageEditor({
  item,
  onEdit,
  onClose,
}: {
  item: HistoryItem;
  onEdit: (item: HistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const { styles } = useStyles();
  const [text, setText] = useState(item.message.markdown ?? '');
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);

  async function save(overwrite = false) {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onEdit(item, text, overwrite);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      else toast.error('Не вдалося зберегти. Перевірте зміни й спробуйте ще раз.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <textarea
        className={styles.editBox}
        aria-label="Редагувати повідомлення"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void save();
          }
        }}
      />
      {conflict && (
        <div className={styles.conflict} role="alert">
          Повідомлення змінилося на іншому пристрої. Ваш текст збережено тут.
          <button type="button" onClick={() => void save(true)}>
            Зберегти поверх
          </button>
        </div>
      )}
      <div className={styles.editActions}>
        <button
          type="button"
          className={styles.tool}
          aria-label="Скасувати редагування"
          onClick={onClose}
        >
          <XIcon size={17} />
        </button>
        <button
          type="button"
          className={styles.tool}
          aria-label="Зберегти зміни"
          disabled={saving || !text.trim()}
          onClick={() => void save()}
        >
          <CheckIcon size={17} />
        </button>
      </div>
    </>
  );
}

interface MessageRowProps {
  item: HistoryItem;
  grouped: boolean;
  actionContext: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  onJump: (messageId: string) => void;
  onEdit: (item: HistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  highlighted: boolean;
}

export const MessageRow = memo(function MessageRow({
  item,
  grouped,
  actionContext,
  actions,
  onAction,
  onJump,
  onEdit,
  highlighted,
}: MessageRowProps) {
  const { styles, cx } = useStyles();
  const authorName = item.author.displayName ?? 'Ім’я недоступне';
  const replyAuthorName = item.reply?.author?.displayName ?? 'Ім’я недоступне';
  const forwardAuthorName = item.forwardedFrom?.displayName ?? 'Ім’я недоступне';
  const isSelected = useConversation((state) => state.selectedIds.includes(item.message.id));
  const hasSelection = useConversation((state) => state.selectedIds.length > 0);
  const toggleSelected = useConversation((state) => state.toggleSelected);
  const editing = useConversation((state) => state.editingId === item.message.id);
  const setEditingId = useConversation((state) => state.setEditingId);
  const [selectedText, setSelectedText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const messageTarget: ActionTarget = { kind: 'message', items: [item] };
  const textTarget: ActionTarget = { kind: 'text', items: [item], selectedText };
  const target = selectedText ? textTarget : messageTarget;
  const available = actions.filter((action) => action.available(target, actionContext));
  const replyAction = actions.find((action) => action.id === 'reply');
  const quoteAction = actions.find((action) => action.id === 'quote');
  const menu = {
    items: available.map((action) => ({
      key: action.id,
      label: action.label(target),
      icon: action.icon,
    })),
    onClick: ({ key }: { key: string }) => {
      const action = available.find((entry) => entry.id === key);
      if (action) onAction(action, target);
    },
  };

  function captureSelection() {
    const selection = window.getSelection();
    const content = contentRef.current;
    if (!selection || !content || !selection.anchorNode || !selection.focusNode) return;
    const within = content.contains(selection.anchorNode) && content.contains(selection.focusNode);
    setSelectedText(within ? selection.toString().trim().slice(0, 2048) : '');
  }

  return (
    <Dropdown trigger={['contextMenu']} menu={menu}>
      <div
        id={`message-${item.message.id}`}
        data-seq={item.seq}
        tabIndex={0}
        aria-label={`Повідомлення від ${authorName}, ${timeFormat.format(new Date(item.message.createdAt))}`}
        className={cx(styles.row, isSelected && styles.selected, highlighted && styles.highlighted)}
        onMouseUp={captureSelection}
        onTouchEnd={captureSelection}
        onContextMenu={captureSelection}
        onClick={(event) => {
          if (!hasSelection || window.getSelection()?.toString()) return;
          if ((event.target as Element).closest('button, a, input, textarea')) return;
          toggleSelected(item.message.id);
        }}
        onKeyDown={(event) => {
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
          if (
            event.key.toLowerCase() === 'r' &&
            replyAction?.available(messageTarget, actionContext)
          )
            onAction(replyAction, messageTarget);
          if (event.key.toLowerCase() === 'e') {
            const editAction = actions.find((action) => action.id === 'edit');
            if (editAction?.available(messageTarget, actionContext))
              onAction(editAction, messageTarget);
          }
          if (event.key === ' ' && hasSelection) {
            event.preventDefault();
            toggleSelected(item.message.id);
          }
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
            <Avatar path={item.author.avatarPath} alt={authorName} size={34} shape="circle" />
          )}
        </div>
        <div className={styles.content}>
          {!grouped && (
            <div className={styles.heading}>
              <span className={styles.author}>{authorName}</span>
              <time className={styles.time} dateTime={item.message.createdAt}>
                {timeFormat.format(new Date(item.message.createdAt))}
              </time>
              {item.message.editedAt && <span className={styles.edited}>ред.</span>}
            </div>
          )}
          {item.message.isForwarded && (
            <div className={styles.forwarded}>Переслано від {forwardAuthorName ?? 'учасника'}</div>
          )}
          {item.reply && (
            <button type="button" className={styles.reply} onClick={() => onJump(item.reply!.id)}>
              ↳ {replyAuthorName ?? 'Повідомлення'} ·{' '}
              {item.message.quoteText ?? <MessagePreview markdown={item.reply.markdown} />}
            </button>
          )}
          {editing ? (
            <MessageEditor item={item} onEdit={onEdit} onClose={() => setEditingId(null)} />
          ) : item.message.markdown === null ? (
            <div className={styles.deleted}>Повідомлення видалено</div>
          ) : (
            <div ref={contentRef} className={styles.markdown}>
              <ReactMarkdown
                allowedElements={[
                  'p',
                  'strong',
                  'em',
                  'code',
                  'pre',
                  'a',
                  'blockquote',
                  'ul',
                  'ol',
                  'li',
                  'br',
                ]}
                components={{
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {item.message.markdown}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!editing && (
          <div className={styles.toolbar} data-message-actions>
            {selectedText && quoteAction?.available(textTarget, actionContext) && (
              <Tooltip title="Цитувати">
                <button
                  type="button"
                  className={styles.tool}
                  aria-label="Цитувати"
                  onClick={() => onAction(quoteAction, textTarget)}
                >
                  <QuotesIcon size={18} />
                </button>
              </Tooltip>
            )}
            {replyAction?.available(messageTarget, actionContext) && (
              <Tooltip title="Відповісти">
                <button
                  type="button"
                  className={styles.tool}
                  aria-label="Відповісти"
                  onClick={() => onAction(replyAction, messageTarget)}
                >
                  {replyAction.icon}
                </button>
              </Tooltip>
            )}
            <Dropdown trigger={['click']} menu={menu}>
              <button type="button" className={styles.tool} aria-label="Дії з повідомленням">
                <DotsThreeIcon size={20} weight="bold" />
              </button>
            </Dropdown>
          </div>
        )}
      </div>
    </Dropdown>
  );
});
