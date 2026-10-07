import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { onSignOut } from '@/features/auth/stores/sign-out-tasks';

import { releasePush } from '../api/push-subscription';
import { pushRegistrationKey, pushRegistrationQuery, usePush } from '../hooks/usePush';

const RESYNC_INTERVAL_MS = 300000;

/** Keeps the browser's push registration current and hands it back on sign-out. */
export function PushSubscriptionSync() {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const { publicKey, subscriptionId } = usePush();

  // Visibility, not every window focus: TanStack's focus manager only listens to visibilitychange.
  useQuery({
    ...pushRegistrationQuery(identity, token, publicKey),
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: RESYNC_INTERVAL_MS,
  });

  useEffect(() => {
    if (!publicKey) return;

    const resynchronize = () =>
      void queryClient.invalidateQueries({ queryKey: pushRegistrationKey(identity) });
    const controller = new AbortController();

    void navigator.permissions
      ?.query({ name: 'notifications' })
      .then((status) => status.addEventListener('change', resynchronize, controller))
      .catch(() => undefined);

    // The worker renewed a rotated subscription; only a page holds the token to register it.
    function onWorkerMessage(event: MessageEvent<{ type?: string }>) {
      if (event.data?.type === 'push/subscription-changed') resynchronize();
    }
    navigator.serviceWorker.addEventListener('message', onWorkerMessage, controller);

    return () => controller.abort();
  }, [queryClient, identity, publicKey]);

  useEffect(() => {
    if (!token || !subscriptionId) return;

    return onSignOut(async () => {
      await releasePush(token, subscriptionId);
      queryClient.removeQueries({ queryKey: pushRegistrationKey(identity) });
    });
  }, [queryClient, identity, token, subscriptionId]);

  return null;
}
