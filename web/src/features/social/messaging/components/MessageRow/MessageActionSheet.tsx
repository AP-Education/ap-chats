import { AiCosmos, AiText } from '@ap-education/ui';
import { createStyles } from 'antd-style';

import type { ActionTarget, ConversationAction } from '@/features/social/conversation/actions';
import { BottomSheet } from '@/shared/ui/BottomSheet';

const useStyles = createStyles(({ token, css }) => ({
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
  assisted: css`
    padding: 0;
  `,
  sky: css`
    && {
      justify-content: flex-start;
      gap: 14px;
      width: 100%;
      min-height: 48px;
      padding: 8px 12px;
      border-radius: 10px;
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
  const { styles, cx } = useStyles();
  return (
    <BottomSheet open={open} onClose={onClose} aria-label="Дії з повідомленням">
      {groups.map((group, index) => (
        <div className={styles.group} key={index}>
          {group.map((action) => (
            <button
              type="button"
              key={action.id}
              className={cx(styles.action, action.accent === 'ai' && styles.assisted)}
              data-danger={action.accent === 'danger' || undefined}
              onClick={() => {
                onClose();
                onAction(action, target);
              }}
            >
              {action.accent === 'ai' ? (
                <AiCosmos className={styles.sky}>
                  {action.icon}
                  <AiText>{action.label(target)}</AiText>
                </AiCosmos>
              ) : (
                <>
                  {action.icon}
                  {action.label(target)}
                </>
              )}
            </button>
          ))}
        </div>
      ))}
    </BottomSheet>
  );
}
