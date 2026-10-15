import { IconButton, useIsMobile } from '@ap-education/ui';
import { XIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useEffect } from 'react';

import { AssistedActionLabel } from '../AssistedActionLabel/AssistedActionLabel';
import type { useConversationActions } from './useConversationActions';

const useStyles = createStyles(({ token, css }) => ({
  // Takes the composer's place and shape while messages are selected.
  shell: css`
    padding: 0 12px 12px;
    pointer-events: auto;

    @media (max-width: ${token.screenMD}px) {
      padding: 4px 8px calc(8px + var(--app-inset-bottom, env(safe-area-inset-bottom, 0px)));
    }
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 52px;
    padding: 4px;
    border-radius: ${token.borderRadiusLG}px;
    background: var(--glass, rgba(255, 255, 255, 0.86));
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    box-shadow:
      0 1px 2px rgba(23, 46, 42, 0.12),
      0 6px 20px rgba(23, 46, 42, 0.06);

    html[data-platform='ios'] & {
      border-radius: 26px;
    }
  `,
  count: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  action: css`
    color: ${token.colorText};

    && {
      border-radius: 50%;
    }
  `,
  // An assistant's action is a labelled button on its own small sky among the plain icons.
  assisted: css`
    display: inline-flex;
    flex-shrink: 0;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,
  sky: css`
    && {
      gap: ${token.marginXS}px;
      height: 36px;
      padding: 0 ${token.paddingMD}px 0 ${token.paddingSM}px;
      border-radius: inherit;
    }
  `,
}));

interface ConversationSelectionBarProps {
  interaction: ReturnType<typeof useConversationActions>;
}

export function ConversationSelectionBar({ interaction }: ConversationSelectionBarProps) {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const { actions, selectedItems, actionContext, onAction, clearSelection } = interaction;
  const selecting = selectedItems.length > 0;

  useEffect(() => {
    if (!selecting) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // A dialog opened over the selection closes first.
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return;
      clearSelection();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selecting, clearSelection]);

  if (!selecting) return null;

  const target = { kind: 'batch' as const, items: selectedItems };
  const size = isMobile ? 44 : 40;

  return (
    <div className={styles.shell}>
      <div className={styles.bar} role="toolbar" aria-label="Вибрані повідомлення">
        <IconButton
          size={size}
          className={styles.action}
          aria-label="Скасувати вибір"
          onClick={clearSelection}
        >
          <XIcon size={20} />
        </IconButton>
        <span className={styles.count}>Вибрано: {selectedItems.length}</span>
        {actions
          .filter((action) => action.available(target, actionContext))
          .map((action) =>
            action.accent === 'ai' ? (
              <button
                type="button"
                key={action.id}
                className={styles.assisted}
                onClick={() => onAction(action, target)}
              >
                <AssistedActionLabel action={action} target={target} className={styles.sky} />
              </button>
            ) : (
              <IconButton
                key={action.id}
                size={size}
                className={styles.action}
                aria-label={action.label(target)}
                onClick={() => onAction(action, target)}
              >
                {action.icon}
              </IconButton>
            ),
          )}
      </div>
    </div>
  );
}
