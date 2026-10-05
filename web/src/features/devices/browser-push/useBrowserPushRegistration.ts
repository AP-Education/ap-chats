import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { pushConfiguration } from './browser-push-api';
import type { BrowserPushState } from './browser-push-context';
import {
  BrowserPushRegistration,
  type BrowserPushRegistrationState,
  type PushAccount,
} from './browser-push-registration';
import { supportsWebPush } from './browser-subscription';

export function useBrowserPushRegistration(
  account: PushAccount | null,
  browser: boolean,
): BrowserPushState {
  const identity = account?.identity ?? null;
  const token = account?.token ?? '';
  const supported = browser && supportsWebPush();
  const configuration = useQuery({
    queryKey: ['web-push-config', identity],
    queryFn: () => pushConfiguration(token),
    enabled: supported && !!identity,
  });
  const publicKey = configuration.data?.publicKey;
  const [state, setState] = useState<BrowserPushRegistrationState>(() => ({
    subscriptionId: null,
    permission: supported ? Notification.permission : 'default',
    busy: false,
    error: null,
  }));
  const [registration] = useState(
    () => new BrowserPushRegistration((changes) => setState((state) => ({ ...state, ...changes }))),
  );

  useEffect(() => {
    registration.setAccount(identity ? { identity, token } : null);
  }, [registration, identity, token]);

  useEffect(() => {
    if (!supported || !identity || !publicKey) return;

    const synchronize = () => void registration.synchronize();
    const refreshVisiblePage = () => {
      if (document.visibilityState === 'visible') synchronize();
    };

    synchronize();
    window.addEventListener('online', synchronize);
    document.addEventListener('visibilitychange', refreshVisiblePage);
    const timer = window.setInterval(refreshVisiblePage, 300000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', synchronize);
      document.removeEventListener('visibilitychange', refreshVisiblePage);
    };
  }, [registration, supported, identity, publicKey]);

  return {
    available: supported && !!publicKey,
    enabled: !!state.subscriptionId,
    subscriptionId: state.subscriptionId,
    busy: state.busy,
    denied: state.permission === 'denied',
    error: state.error,
    enable: async () => {
      if (supported && publicKey) await registration.enable(publicKey);
    },
    disable: async () => {
      if (supported) await registration.disable();
    },
  };
}
