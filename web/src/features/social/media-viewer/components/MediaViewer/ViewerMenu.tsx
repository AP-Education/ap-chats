import { useTimelineMediaActions, useTimelineMediaItem } from '@ap-education/timeline/media';
import { groupActions, messageActionOrder } from '@ap-education/ui';
import { MediaViewerAction, useMediaViewer } from '@ap-education/ui/media';
import { ChatCircleTextIcon, DotsThreeIcon } from '@phosphor-icons/react';
import { Dropdown, type MenuProps } from 'antd';

import type { ChatMedia } from '@/features/social/messaging/message-media';
import type { MessageEntry } from '@/features/social/messaging/timeline/chat-entry';
import type { ActionTarget } from '@/features/social/messaging/types';

import type { ViewerActions } from '../../types';

// What the message's menu in the chat offers that still makes sense over its media; forwarding
// has its own button.
const VIEWER_ACTIONS = new Set(['reply', 'copy', 'pin', 'reactions', 'delete']);

const SHOW_IN_CHAT = 'show-in-chat';

export function ViewerMenu({ actions }: { actions: ViewerActions }) {
  const { entry } = useTimelineMediaItem<MessageEntry, ChatMedia>();
  const { showEntry } = useTimelineMediaActions();
  const { edge, leave } = useMediaViewer();
  const target: ActionTarget = { kind: 'message', items: [entry.payload.item] };
  const available = actions.actions.filter(
    (action) => VIEWER_ACTIONS.has(action.id) && action.available(target, actions.context),
  );
  const items: MenuProps['items'] = [
    { key: SHOW_IN_CHAT, label: 'Показати в чаті', icon: <ChatCircleTextIcon size={18} /> },
  ];

  for (const group of groupActions(available, messageActionOrder)) {
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
    if (key === SHOW_IN_CHAT) {
      showEntry(entry.key);
      return;
    }

    const action = available.find((entry) => entry.id === key);
    if (action) leave(() => actions.run(action, target));
  };

  return (
    <Dropdown
      trigger={['click']}
      // The menu opens away from the edge the actions sit at.
      placement={edge === 'top' ? 'bottomRight' : 'topRight'}
      menu={{ items, onClick: choose }}
      // Inside the viewer, or PhotoSwipe's focus trap pulls focus back out of the menu.
      getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
    >
      <MediaViewerAction label="Інші дії">
        <DotsThreeIcon size={22} weight="bold" />
      </MediaViewerAction>
    </Dropdown>
  );
}
