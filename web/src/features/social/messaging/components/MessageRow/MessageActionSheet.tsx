import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AssistedActionLabel } from '@/features/social/conversation/components/AssistedActionLabel/AssistedActionLabel';
import { extensionNamespaces } from '@/features/social/conversation-scope/extensions';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import type { ActionTarget, ConversationAction } from '../../types';

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
  header?: ReactNode;
  target: ActionTarget;
  groups: ConversationAction[][];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
}

export function MessageActionSheet({
  open,
  onClose,
  header,
  target,
  groups,
  onAction,
}: MessageActionSheetProps) {
  const { styles, cx } = useStyles();
  const { t } = useTranslation(extensionNamespaces);

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t(($) => $.message.actionsSheet)}>
      {header}
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
                <AssistedActionLabel action={action} target={target} className={styles.sky} />
              ) : (
                <>
                  {action.icon}
                  {action.label(target, t)}
                </>
              )}
            </button>
          ))}
        </div>
      ))}
    </BottomSheet>
  );
}
