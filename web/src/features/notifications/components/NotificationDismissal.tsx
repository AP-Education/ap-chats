import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';

import { dismissNotifications } from '../api/shown-notifications';

/** Takes a conversation's notifications off the screen once it is read, here or on another device. */
export function NotificationDismissal() {
  useSocketEvent('social:read-state', ({ channelId, unreadCount }) => {
    if (unreadCount > 0) return;

    // Conversation notifications collapse under their channel ID on every platform.
    void dismissNotifications(channelId).catch(() => undefined);
  });

  return null;
}
