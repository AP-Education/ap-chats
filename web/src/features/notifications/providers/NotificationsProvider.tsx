import type { PropsWithChildren } from 'react';

import { AttentionReporter } from '../components/AttentionReporter';
import { MessageNotificationSound } from '../components/MessageNotificationSound';
import { NotificationDismissal } from '../components/NotificationDismissal';
import { PushNavigation } from '../components/PushNavigation';
import { PushSubscriptionSync } from '../components/PushSubscriptionSync';

/**
 * Push subscription, what the person is looking at, the app's own sound while it is on screen, and
 * opening the conversation a push points to.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  return (
    <>
      <PushSubscriptionSync />
      <AttentionReporter />
      <MessageNotificationSound />
      <NotificationDismissal />
      <PushNavigation>{children}</PushNavigation>
    </>
  );
}
