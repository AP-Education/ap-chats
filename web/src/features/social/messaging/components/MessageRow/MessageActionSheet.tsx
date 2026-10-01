import { Drawer } from 'antd';
import { createStyles } from 'antd-style';

import type { ActionTarget, ConversationAction } from '@/features/social/conversation/actions';

const useStyles = createStyles(({ token, css }) => ({
  sheet: css`
    :global(.ant-drawer-content) {
      border-radius: 20px 20px 0 0;
      overflow: hidden;
    }
    :global(.ant-drawer-body) {
      padding: 8px 12px calc(16px + env(safe-area-inset-bottom, 0px));
    }
  `,
  handle: css`
    width: 36px;
    height: 4px;
    margin: 2px auto 16px;
    border-radius: 2px;
    background: ${token.colorBorder};
  `,
  group: css`
    padding: 4px 0;
    & + & {
      border-top: 1px solid ${token.colorBorderSecondary};
    }
  `,
  action: css`
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 48px;
    padding: 8px 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    text-align: left;
    &:active {
      background: ${token.colorFillTertiary};
    }
    &[data-danger] {
      color: ${token.colorError};
    }
  `,
}));

interface MessageActionSheetProps {
  open: boolean;
  onClose: () => void;
  target: ActionTarget;
  groups: ConversationAction[][];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
}

export function MessageActionSheet({
  open,
  onClose,
  target,
  groups,
  onAction,
}: MessageActionSheetProps) {
  const { styles } = useStyles();
  return (
    <Drawer
      placement="bottom"
      open={open}
      onClose={onClose}
      closable={false}
      height="auto"
      className={styles.sheet}
      aria-label="Дії з повідомленням"
    >
      <div className={styles.handle} aria-hidden="true" />
      {groups.map((group, index) => (
        <div className={styles.group} key={index}>
          {group.map((action) => (
            <button
              type="button"
              key={action.id}
              className={styles.action}
              data-danger={action.id === 'delete' || undefined}
              onClick={() => {
                onClose();
                onAction(action, target);
              }}
            >
              {action.icon}
              {action.label(target)}
            </button>
          ))}
        </div>
      ))}
    </Drawer>
  );
}
