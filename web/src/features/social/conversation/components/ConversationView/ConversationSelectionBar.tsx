import { Button } from 'antd';
import { createStyles } from 'antd-style';

import type { useConversationActions } from './useConversationActions';
import { conversationActions } from './useConversationActions';

const useStyles = createStyles(({ token, css }) => ({
  selection: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 20px;
    border-top: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorPrimaryBg};
    pointer-events: auto;
  `,
  selectionCount: css`
    flex: 1;
    font-weight: 600;
  `,
}));

interface ConversationSelectionBarProps {
  interaction: ReturnType<typeof useConversationActions>;
}

export function ConversationSelectionBar({ interaction }: ConversationSelectionBarProps) {
  const { styles } = useStyles();
  const { selectedItems, actionContext, onAction, clearSelection } = interaction;
  if (!selectedItems.length) return null;

  return (
    <div className={styles.selection}>
      <span className={styles.selectionCount}>Вибрано: {selectedItems.length}</span>
      {conversationActions
        .filter((action) =>
          action.available({ kind: 'batch', items: selectedItems }, actionContext),
        )
        .map((action) => (
          <Button
            key={action.id}
            icon={action.icon}
            onClick={() => onAction(action, { kind: 'batch', items: selectedItems })}
          >
            {action.label({ kind: 'batch', items: selectedItems })}
          </Button>
        ))}
      <Button onClick={clearSelection}>Скасувати</Button>
    </div>
  );
}
