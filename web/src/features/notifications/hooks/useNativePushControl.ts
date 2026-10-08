import { onNativeMessage, postToNative } from '@ap-education/shell-sdk';
import { useEffect, useState } from 'react';

import type {
  NativePushPermission,
  NativePushPermissionMessage,
  NotificationsToNativeMessage,
  PushControl,
} from '../types';

// The phone decides: the first tap asks the OS, later taps open its Settings, the only place to change it.
export function useNativePushControl(): PushControl | null {
  const [permission, setPermission] = useState<NativePushPermission | null>(null);

  useEffect(() => {
    const stop = onNativeMessage<NativePushPermissionMessage | { type: string }>((message) => {
      if (message.type === 'notifications/permission') {
        setPermission((message as NativePushPermissionMessage).status);
      }
    });
    tellNative({ type: 'notifications/permission-check' });

    return stop;
  }, []);

  // An older shell never answers, so the control stays hidden there.
  if (!permission) return null;

  const status = STATUSES[permission];
  return {
    status,
    hint: HINTS[status],
    busy: false,
    change: () => tellNative({ type: 'notifications/settings' }),
  };
}

const STATUSES: Record<NativePushPermission, PushControl['status']> = {
  granted: 'on',
  undetermined: 'off',
  denied: 'blocked',
};

const HINTS: Record<PushControl['status'], string> = {
  on: 'Вимкнути можна в налаштуваннях телефону',
  off: 'Увімкнути сповіщення',
  blocked: 'Сповіщення вимкнено. Увімкніть їх у налаштуваннях телефону',
};

function tellNative(message: NotificationsToNativeMessage): void {
  postToNative(message);
}
