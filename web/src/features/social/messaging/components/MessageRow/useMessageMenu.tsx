import type { MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { AssistedActionLabel } from '@/features/social/conversation/components/AssistedActionLabel/AssistedActionLabel';
import { extensionNamespaces } from '@/features/social/conversation-scope/extensions';

import { groupMessageActions } from './messageActionGroups';
import { useMessageActionScope } from './MessageActionScope';

const useStyles = createStyles(({ token, css }) => ({
  sky: css`
    && {
      justify-content: flex-start;
      gap: ${token.marginXS}px;
      width: 100%;
      min-height: ${token.controlHeight}px;
      padding: 0 ${token.controlPaddingHorizontal}px;
      border-radius: ${token.borderRadiusSM}px;
    }
  `,
}));

// The sky is the whole row: the item gives up its own padding and hover fill to it.
const ASSISTED_ITEM = { padding: 0, background: 'transparent' };

/** The right-click menu: the actions available for the message, or for selected text in it. */
export function useMessageMenu(): MenuProps {
  const { styles } = useStyles();
  const { t } = useTranslation(extensionNamespaces);
  const scope = useMessageActionScope();
  const target = scope.selectedText ? scope.textTarget : scope.messageTarget;
  const available = scope.available(target);
  const items: MenuProps['items'] = [];

  for (const group of groupMessageActions(available)) {
    if (items.length) items.push({ type: 'divider' });
    for (const action of group) {
      items.push(
        action.accent === 'ai'
          ? {
              key: action.id,
              label: <AssistedActionLabel action={action} target={target} className={styles.sky} />,
              style: ASSISTED_ITEM,
            }
          : {
              key: action.id,
              label: action.label(target, t),
              icon: action.icon,
              danger: action.accent === 'danger',
            },
      );
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
