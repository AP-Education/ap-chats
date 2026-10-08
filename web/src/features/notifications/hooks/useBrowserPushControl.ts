import type { PushControl } from '../types';
import { usePush } from './usePush';
import { usePushToggle } from './usePushToggle';

export function useBrowserPushControl(): PushControl | null {
  const push = usePush();
  const toggle = usePushToggle();
  if (!push.available) return null;

  const status = push.enabled ? 'on' : push.permission === 'denied' ? 'blocked' : 'off';

  return { status, hint: toggle.error ?? HINTS[status], busy: toggle.busy, change: toggle.toggle };
}

const HINTS: Record<PushControl['status'], string> = {
  on: 'Вимкнути сповіщення',
  off: 'Натисніть, щоб браузер запитав дозвіл на сповіщення',
  blocked: 'Браузер заблокував сповіщення. Дозвольте їх у налаштуваннях сайту',
};
