import { DotsThreeIcon } from '@phosphor-icons/react';
import { Dropdown, type MenuProps } from 'antd';
import { createStyles } from 'antd-style';

import { QuoteIcon } from '@/features/social/conversation/actionIcons';

import { groupMessageActions } from './messageActionGroups';
import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    position: absolute;
    z-index: 2;
    top: 1px;
    left: calc(100% + 10px);
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px) saturate(1.6);
    box-shadow: 0 1px 3px rgba(23, 46, 42, 0.16);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;

    [data-side='own'] > & {
      left: auto;
      right: calc(100% + 10px);
    }
  `,
  tool: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
}));

function useMessageMenu(): MenuProps {
  const scope = useMessageActionScope();
  const target = scope.selectedText ? scope.textTarget : scope.messageTarget;
  const available = scope.available(target);
  const items: MenuProps['items'] = [];

  for (const group of groupMessageActions(available)) {
    if (items.length) items.push({ type: 'divider' });
    for (const action of group) {
      items.push({
        key: action.id,
        label: action.label(target),
        icon: action.icon,
        danger: action.id === 'delete',
      });
    }
  }

  return {
    items,
    onClick: ({ key }) => {
      const action = available.find((entry) => entry.id === key);
      if (action) scope.onAction(action, target);
    },
  };
}

export function DesktopMessageActions({ rowProps, children }: MessageActionsProps) {
  const scope = useMessageActionScope();
  const menu = useMessageMenu();
  const reply = scope.action('reply');

  return (
    <Dropdown trigger={['contextMenu']} menu={menu}>
      <div
        {...rowProps}
        onMouseUp={scope.captureSelection}
        onContextMenu={scope.captureSelection}
        onKeyDown={(event) => {
          rowProps.onKeyDown?.(event);
          if (event.target !== event.currentTarget || event.defaultPrevented) return;
          if (
            event.key.toLowerCase() === 'r' &&
            reply?.available(scope.messageTarget, scope.context)
          )
            scope.onAction(reply, scope.messageTarget);
          if (event.key.toLowerCase() === 'e') {
            const edit = scope.action('edit');
            if (edit?.available(scope.messageTarget, scope.context))
              scope.onAction(edit, scope.messageTarget);
          }
        }}
      >
        {children}
      </div>
    </Dropdown>
  );
}

// Rendered beside the bubble, on the side facing the middle of the conversation.
export function DesktopMessageToolbar() {
  const { styles } = useStyles();
  const scope = useMessageActionScope();
  const menu = useMessageMenu();
  const reply = scope.action('reply');
  const quote = scope.action('quote');

  if (scope.editing || scope.delivery) return null;

  return (
    <div className={styles.toolbar} data-message-actions>
      {scope.selectedText && quote?.available(scope.textTarget, scope.context) && (
        <button
          type="button"
          className={styles.tool}
          aria-label="Цитувати"
          onClick={() => scope.onAction(quote, scope.textTarget)}
        >
          <QuoteIcon size={18} />
        </button>
      )}
      {reply?.available(scope.messageTarget, scope.context) && (
        <button
          type="button"
          className={styles.tool}
          aria-label="Відповісти"
          onClick={() => scope.onAction(reply, scope.messageTarget)}
        >
          {reply.icon}
        </button>
      )}
      <Dropdown trigger={['click']} menu={menu}>
        <button type="button" className={styles.tool} aria-label="Дії з повідомленням">
          <DotsThreeIcon size={20} />
        </button>
      </Dropdown>
    </div>
  );
}
