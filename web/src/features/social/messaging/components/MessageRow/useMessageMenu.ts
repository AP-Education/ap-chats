import type { MenuProps } from 'antd';

import { groupMessageActions } from './messageActionGroups';
import { useMessageActionScope } from './MessageActionScope';

/** The right-click menu: the actions available for the message, or for selected text in it. */
export function useMessageMenu(): MenuProps {
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
