import { queryOptions, useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { getAppShell } from '@/lib/app-shell';

import { fetchPushConfiguration } from '../api/push-api';
import { supportsPush, synchronizePush } from '../api/push-subscription';

export interface PushState {
  available: boolean;
  enabled: boolean;
  permission: NotificationPermission;
  subscriptionId: string | null;
  publicKey: string | null;
  synchronizationFailed: boolean;
}

export function pushRegistrationKey(identity: string | undefined) {
  return ['push', 'registration', identity] as const;
}

/** One synchronization per account; PushSubscriptionSync alone decides when to repeat it. */
export function pushRegistrationQuery(
  identity: string | undefined,
  token: string | undefined,
  publicKey: string | null,
) {
  return queryOptions({
    queryKey: pushRegistrationKey(identity),
    queryFn: () => synchronizePush(token!, publicKey!),
    enabled: !!identity && !!token && !!publicKey,
    staleTime: Infinity,
    retry: false,
  });
}

/** Browser push for the signed-in account; unavailable inside the native shell. */
export function usePush(): PushState {
  const { token, identity } = useQueryAuth();
  const supported = getAppShell().kind === 'browser' && supportsPush();

  const configuration = useQuery({
    queryKey: ['push', 'configuration', identity],
    queryFn: () => fetchPushConfiguration(token!),
    enabled: supported && !!identity,
    staleTime: Infinity,
  });
  const publicKey = (supported && configuration.data?.publicKey) || null;
  const registration = useQuery(pushRegistrationQuery(identity, token, publicKey));

  const subscriptionId = registration.data?.subscriptionId ?? null;
  return {
    available: !!publicKey,
    enabled: !!subscriptionId,
    permission: registration.data?.permission ?? (supported ? Notification.permission : 'default'),
    subscriptionId,
    publicKey,
    synchronizationFailed: registration.isError,
  };
}
