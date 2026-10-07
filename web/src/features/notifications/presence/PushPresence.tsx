import { useEffect, useRef } from 'react';

import { updatePresence, useWebPush } from '@/features/devices/browser-push';
import { getAppShell } from '@/lib/app-shell';
import { isAttending } from '@/shared/hooks/useIsAttending';
import { postToNative } from '@/shared/lib/nativeBridge';

import { useCurrentUser } from '../../auth/stores/current-user-context';
import { useConnection } from '../../realtime/stores/realtime-context';

const LEASE_RENEW_MS = 30000;
// Long enough for the tab taking focus to claim the lease before this one lets it go.
const RELEASE_GRACE_MS = 500;
const TABS_CHANNEL = 'ap:push-presence';

/**
 * Tells the server whether the user is reading here, so it holds back OS alerts meanwhile.
 * Only a tab that gained attention speaks, so background tabs never overwrite the reader's lease.
 */
export function PushPresence() {
  const user = useCurrentUser();
  const connection = useConnection();
  const { subscriptionId } = useWebPush();
  const token = user.status === 'signed-in' ? user.accessToken : '';
  const connected = connection.status === 'connected';
  const isConnected = useRef(connected);
  const reevaluate = useRef<() => void>(() => undefined);

  useEffect(() => {
    const native = getAppShell().kind === 'mobile';
    if (!native && (!subscriptionId || !token)) return;

    function report(attending: boolean) {
      if (native) {
        postToNative({ type: 'notifications/context', payload: { connected: attending } });
        return;
      }

      void updatePresence(token, subscriptionId!, { focused: attending }).catch(() => undefined);
    }

    const tabs = native ? null : new BroadcastChannel(TABS_CHANNEL);
    let attending = false;
    let renewTimer: number | undefined;
    let releaseTimer: number | undefined;

    function claim() {
      window.clearTimeout(releaseTimer);
      report(true);
      tabs?.postMessage('claimed');
      renewTimer = window.setInterval(() => report(true), LEASE_RENEW_MS);
    }

    function release() {
      window.clearInterval(renewTimer);
      releaseTimer = window.setTimeout(() => report(false), native ? 0 : RELEASE_GRACE_MS);
    }

    function update() {
      const next = isAttending() && isConnected.current;
      if (next === attending) return;

      attending = next;
      if (next) claim();
      else release();
    }

    // A closing tab has no time left for a grace period.
    function leave() {
      if (!attending) return;

      attending = false;
      window.clearInterval(renewTimer);
      report(false);
    }

    if (tabs) tabs.onmessage = () => window.clearTimeout(releaseTimer);
    reevaluate.current = update;
    update();

    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    window.addEventListener('pageshow', update);
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', update);

    return () => {
      reevaluate.current = () => undefined;
      window.clearInterval(renewTimer);
      window.clearTimeout(releaseTimer);
      tabs?.close();
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
      window.removeEventListener('pageshow', update);
      window.removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', update);
    };
  }, [token, subscriptionId]);

  useEffect(() => {
    isConnected.current = connected;
    reevaluate.current();
  }, [connected]);

  return null;
}
