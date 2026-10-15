import type { PropsWithChildren } from 'react';

import { AttentionReporter } from '../components/AttentionReporter';
import { NotificationDismissal } from '../components/NotificationDismissal';
import { PushNavigation } from '../components/PushNavigation';
import { PushSubscriptionSync } from '../components/PushSubscriptionSync';

/** Push subscription, what the person is looking at, and opening the conversation a push points to. */
export function NotificationsProvider({ children }: PropsWithChildren) {
  return (
    <>
      <PushSubscriptionSync />
      <AttentionReporter />
      <NotificationDismissal />
      <PushNavigation>{children}</PushNavigation>
    </>
  );
}
