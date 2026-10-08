import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '../../auth';
import { useNotificationStore } from '../store/notification-store';
import { notificationIntent } from '../utils/notification-intent';

/** Decides foreground banners and turns notification taps into pending in-app routes. */
export function NotificationResponses() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    // A user reading the WebView already hears its sound; a banner on top would be a second alert.
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        const handledByWeb =
          AppState.currentState === 'active' && useNotificationStore.getState().webAttending;
        return {
          shouldShowBanner: !handledByWeb,
          shouldShowList: !handledByWeb,
          shouldPlaySound: !handledByWeb,
          shouldSetBadge: false,
        };
      },
    });

    function open(response: Notifications.NotificationResponse) {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

      const intent = notificationIntent(response.notification.request.content.data);
      if (intent) useNotificationStore.getState().open(intent);
      else void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }

    const response = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync()
      .then((last) => last && open(last))
      .catch(() => undefined);

    return () => {
      response.remove();
      Notifications.setNotificationHandler(null);
    };
  }, []);

  useEffect(() => {
    if (status !== 'signed-in') useNotificationStore.getState().setWebReady(false);
  }, [status]);

  return null;
}
