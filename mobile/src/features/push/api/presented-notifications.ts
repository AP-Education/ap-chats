import * as Notifications from 'expo-notifications';

/** Takes shown notifications off the notification center: those under one collapse key, or all. */
export async function dismissPresentedNotifications(collapseKey?: string): Promise<void> {
  if (!collapseKey) {
    await Notifications.dismissAllNotificationsAsync().catch(() => undefined);
    return;
  }

  const presented = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  const matching = presented.filter(
    ({ request }) =>
      (request.content.data as { collapseKey?: unknown })?.collapseKey === collapseKey,
  );

  await Promise.all(
    matching.map(({ request }) =>
      Notifications.dismissNotificationAsync(request.identifier).catch(() => undefined),
    ),
  );
}
