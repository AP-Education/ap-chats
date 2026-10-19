import { useTranslation } from 'react-i18next';

import type { PushControl } from '../types';
import { usePush } from './usePush';
import { usePushToggle } from './usePushToggle';

export function useBrowserPushControl(): PushControl | null {
  const { t } = useTranslation('notifications');
  const push = usePush();
  const toggle = usePushToggle();
  if (!push.available) return null;

  const status = push.enabled ? 'on' : push.permission === 'denied' ? 'blocked' : 'off';

  return {
    status,
    hint: toggle.error ?? t(($) => $.browser[status]),
    busy: toggle.busy,
    change: toggle.toggle,
  };
}
