import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '../../auth';
import { useNotificationStore } from '../store/notification-store';
import { notificationIntent } from '../utils/notification-intent';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const handledByWeb =
      AppState.currentState === 'active' &&
      useNotificationStore.getState().webReady &&
      useNotificationStore.getState().context.connected;
    return {
      shouldShowBanner: !handledByWeb,
      shouldShowList: !handledByWeb,
      shouldPlaySound: !handledByWeb,
      shouldSetBadge: false,
    };
  },
});

export function NotificationResponses() {
  const status = useAuthStore((state) => state.status);
  useEffect(() => {
    function open(response: Notifications.NotificationResponse) {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const intent = notificationIntent(response.notification.request.content.data);
      if (intent) useNotificationStore.getState().open(intent);
      else void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }
    const response = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (last) open(last);
      })
      .catch(() => undefined);
    return () => response.remove();
  }, []);
  useEffect(() => {
    if (status === 'signed-in') return;
    useNotificationStore.getState().setReady(false);
  }, [status]);
  return null;
}
