import { DotsThreeIcon } from '@phosphor-icons/react';
import { Dropdown, type MenuProps, Tooltip } from 'antd';
import { createStyles } from 'antd-style';

import { QuoteIcon } from '@/features/social/conversation/actionIcons';

import { groupMessageActions } from './messageActionGroups';
import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    position: absolute;
    z-index: 2;
    top: -16px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 9px;
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowSecondary};
    opacity: 0;
    pointer-events: none;
  `,
  tool: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
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
}));

export function DesktopMessageActions({ rowProps, children }: MessageActionsProps) {
  const { styles } = useStyles();
  const scope = useMessageActionScope();
  const target = scope.selectedText ? scope.textTarget : scope.messageTarget;
  const available = scope.available(target);
  const reply = scope.action('reply');
  const quote = scope.action('quote');
  const menuItems: MenuProps['items'] = [];
  for (const group of groupMessageActions(available)) {
    if (menuItems.length) menuItems.push({ type: 'divider' });
    for (const action of group) {
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
      if (action) scope.onAction(action, target);
    },
  };

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
        {!scope.editing && !scope.delivery && (
          <div className={styles.toolbar} data-message-actions>
            {scope.selectedText && quote?.available(scope.textTarget, scope.context) && (
              <Tooltip title="Цитувати">
                <button
                  type="button"
                  className={styles.tool}
                  aria-label="Цитувати"
                  onClick={() => scope.onAction(quote, scope.textTarget)}
                >
                  <QuoteIcon size={18} />
                </button>
              </Tooltip>
            )}
            {reply?.available(scope.messageTarget, scope.context) && (
              <Tooltip title="Відповісти">
                <button
                  type="button"
                  className={styles.tool}
                  aria-label="Відповісти"
                  onClick={() => scope.onAction(reply, scope.messageTarget)}
                >
                  {reply.icon}
                </button>
              </Tooltip>
            )}
            <Dropdown trigger={['click']} menu={menu}>
              <button type="button" className={styles.tool} aria-label="Дії з повідомленням">
                <DotsThreeIcon size={20} />
              </button>
            </Dropdown>
          </div>
        )}
      </div>
    </Dropdown>
  );
}
