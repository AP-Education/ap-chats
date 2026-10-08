import { isNativeShell, postToNative } from '@ap-education/shell-sdk';

import type { NotificationsToNativeMessage } from '../types';

/** Takes shown notifications off the screen: those under one collapse key, or all of them. */
export async function dismissNotifications(collapseKey?: string): Promise<void> {
  if (isNativeShell()) {
    if (collapseKey) tellNative({ type: 'notifications/dismiss', collapseKey });
    return;
  }

  const registration = await navigator.serviceWorker?.getRegistration('/');
  const shown =
    (await registration?.getNotifications(collapseKey ? { tag: collapseKey } : {})) ?? [];

  shown.forEach((notification) => notification.close());
}

function tellNative(message: NotificationsToNativeMessage): void {
  postToNative(message);
}
