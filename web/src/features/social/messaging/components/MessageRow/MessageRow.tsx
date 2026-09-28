import {
  ArrowBendUpRightIcon,
  DotsThreeIcon,
  QuotesIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { Button, Dropdown, type MenuProps, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useLayoutEffect, useRef, useState } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';
import { useConversation } from '@/features/social/conversation/store';
import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';
import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';
import { Avatar } from '@/shared/ui/Avatar/Avatar';

import type { HistoryItem } from '../../types';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { MessageEditor } from './MessageEditor';

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
    [data-hover-suppressed] &:hover:not([data-selected]):not([data-failed]) {
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
    font-size: 11px;
  `,
  edited: css`
    color: ${token.colorTextQuaternary};
    font-size: 11px;
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
    gap: 4px;
    margin-bottom: 4px;
    color: ${token.colorTextSecondary};
    font-size: 14px;
    line-height: 20px;
  `,
  forwardedName: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: ${token.colorPrimary};
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  `,
  markdown: css`
    font-size: 16px;
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
  delivery: css`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    color: ${token.colorTextTertiary};
    font-size: 11px;
  `,
  retry: css`
    && {
      padding-inline: 2px;
      height: auto;
      font-size: 11px;
      line-height: 1.3;
    }
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
}));

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

interface MessageRowProps {
  item: HistoryItem;
  grouped: boolean;
  actionContext: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  onJump: (messageId: string) => void;
  onEdit: (item: HistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
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
  const isSelected = useConversation((state) => state.selectedIds.includes(item.message.id));
  const hasSelection = useConversation((state) => state.selectedIds.length > 0);
  const toggleSelected = useConversation((state) => state.toggleSelected);
  const editing = useConversation((state) => state.editingId === item.message.id);
  const setEditingId = useConversation((state) => state.setEditingId);
  const [selectedText, setSelectedText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const contentHeight = useRef(40);
  useLayoutEffect(() => {
    if (!editing && contentRef.current) contentHeight.current = contentRef.current.offsetHeight;
  }, [editing, item.message.markdown]);
  const messageTarget: ActionTarget = { kind: 'message', items: [item] };
  const textTarget: ActionTarget = { kind: 'text', items: [item], selectedText };
  const target = selectedText ? textTarget : messageTarget;
  const available = delivery
    ? []
    : actions.filter((action) => action.available(target, actionContext));
  const replyAction = actions.find((action) => action.id === 'reply');
  const quoteAction = actions.find((action) => action.id === 'quote');
  const prioritizedGroups = [['quote', 'reply'], ['copy'], ['edit', 'pin', 'forward', 'select']];
  const prioritizedIds = new Set([...prioritizedGroups.flat(), 'delete']);
  const menuGroups = [
    ...prioritizedGroups,
    available.filter((action) => !prioritizedIds.has(action.id)).map((action) => action.id),
    ['delete'],
  ];
  const menuItems: MenuProps['items'] = [];
  for (const group of menuGroups) {
    const groupActions = group
      .map((id) => available.find((action) => action.id === id))
      .filter((action): action is ConversationAction => Boolean(action));
    if (!groupActions.length) continue;
    if (menuItems.length) menuItems.push({ type: 'divider' });
    for (const action of groupActions) {
      menuItems.push({
        key: action.id,
        label: action.label(target),
        icon: action.icon,
        danger: action.id === 'delete',
      });
    }
  }
  const menu = {
    items: menuItems,
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
        data-seq={delivery ? undefined : item.seq}
        data-selected={isSelected || undefined}
        data-failed={delivery === 'failed' || undefined}
        tabIndex={delivery ? -1 : 0}
        aria-label={`Повідомлення від ${authorName}, ${timeFormat.format(new Date(item.message.createdAt))}`}
        className={cx(
          styles.row,
          isSelected && styles.selected,
          delivery === 'sending' && styles.sending,
          delivery === 'failed' && styles.failed,
          delivery === 'confirmed' && styles.confirmed,
        )}
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
              <ArrowBendUpRightIcon size={16} aria-hidden />
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
          {editing ? (
            <MessageEditor
              item={item}
              minHeight={contentHeight.current}
              onEdit={onEdit}
              onClose={() => setEditingId(null)}
            />
          ) : item.message.markdown === null ? (
            <div className={styles.deleted}>Повідомлення видалено</div>
          ) : (
            <div ref={contentRef} className={styles.markdown} data-message-text>
              <MessageMarkdown markdown={item.message.markdown} mentions={item.mentions} />
            </div>
          )}
          {delivery === 'failed' && (
            <div className={styles.delivery}>
              <WarningCircleIcon size={14} /> Не надіслано
              <Button type="link" size="small" className={styles.retry} onClick={onRetry}>
                Повторити
              </Button>
            </div>
          )}
        </div>
        {!editing && !delivery && (
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
