import { IconButton } from '@ap-education/ui';
import { ChatCircleTextIcon, DotsThreeIcon } from '@phosphor-icons/react';
import { Dropdown, type MenuProps } from 'antd';

import { groupMessageActions } from '@/features/social/messaging/components/MessageRow/messageActionGroups';
import type { ActionTarget } from '@/features/social/messaging/types';

import type { ViewerActions } from '../../types';

// What the message's menu in the chat offers that still makes sense over its media; forwarding
// has its own button.
const VIEWER_ACTIONS = new Set(['reply', 'copy', 'pin', 'reactions', 'delete']);

const SHOW_IN_CHAT = 'show-in-chat';

interface ViewerMenuProps {
  target: ActionTarget;
  actions: ViewerActions;
  onLeave: (next: () => void) => void;
  placement: 'bottomRight' | 'topRight';
}

export function ViewerMenu({ target, actions, onLeave, placement }: ViewerMenuProps) {
  const available = actions.actions.filter(
    (action) => VIEWER_ACTIONS.has(action.id) && action.available(target, actions.context),
  );
  const items: MenuProps['items'] = [
    { key: SHOW_IN_CHAT, label: 'Показати в чаті', icon: <ChatCircleTextIcon size={18} /> },
  ];

  for (const group of groupMessageActions(available)) {
    items.push({ type: 'divider' });
    for (const action of group) {
      items.push({
        key: action.id,
        label: action.label(target),
        icon: action.icon,
        danger: action.id === 'delete',
      });
    }
  }

  const choose: MenuProps['onClick'] = ({ key }) => {
    const messageId = target.items[0]!.message.id;
    if (key === SHOW_IN_CHAT) {
      onLeave(() => actions.showInChat(messageId));
      return;
    }

    const action = available.find((entry) => entry.id === key);
    if (action) onLeave(() => actions.run(action, target));
  };

  return (
    <Dropdown
      trigger={['click']}
      placement={placement}
      menu={{ items, onClick: choose }}
      // Inside the viewer, or PhotoSwipe's focus trap pulls focus back out of the menu.
      getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
    >
      <IconButton size={40} aria-label="Інші дії">
        <DotsThreeIcon size={22} weight="bold" />
      </IconButton>
    </Dropdown>
  );
}
