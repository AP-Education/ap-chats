import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { updatePresence, useWebPush } from '@/features/devices/browser-push';
import { getAppShell } from '@/lib/app-shell';

import { useCurrentUser } from '../../auth/stores/current-user-context';
import { useConnection } from '../../realtime/stores/realtime-context';
import { useActiveWorkspace } from '../../workspaces/hooks/useActiveWorkspace';

export function PushPresence() {
  const { pathname } = useLocation();
  const user = useCurrentUser();
  const { workspace } = useActiveWorkspace();
  const connection = useConnection();
  const { subscriptionId } = useWebPush();
  const token = user.status === 'signed-in' ? user.accessToken : '';
  const channelId = /^\/(channels|direct)\/([0-9a-f-]{36})$/iu.exec(pathname)?.[2];
  const workspaceId = workspace?.id;
  const connected = connection.status === 'connected';

  useEffect(() => {
    const native = getAppShell().kind === 'mobile';
    const send = (clear = false) => {
      const focused =
        !clear && document.visibilityState === 'visible' && document.hasFocus() && connected;
      if (native) {
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: 'notifications/context',
            payload: { connected: focused, workspaceId, channelId },
          }),
        );
      } else if (subscriptionId && token) {
        void updatePresence(token, subscriptionId, { focused, workspaceId, channelId }).catch(
          () => undefined,
        );
      }
    };
    const update = () => send();
    const hide = () => send(true);
    send();
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', update);
    document.addEventListener('visibilitychange', update);
    const timer = window.setInterval(update, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', update);
      document.removeEventListener('visibilitychange', update);
      send(true);
    };
  }, [token, subscriptionId, connected, channelId, workspaceId]);
  return null;
}
