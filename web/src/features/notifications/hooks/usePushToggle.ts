import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { disablePush, enablePush, type PushRegistration } from '../api/push-subscription';
import { pushRegistrationKey, usePush, usePushLaunchPath } from './usePush';

export function usePushToggle() {
  const { t } = useTranslation('notifications');
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const push = usePush();
  const launchPath = usePushLaunchPath();

  const save = (registration: PushRegistration) =>
    queryClient.setQueryData(pushRegistrationKey(identity), registration);
  const enable = useMutation({
    mutationFn: () => enablePush(token!, push.publicKey!, launchPath),
    onSuccess: save,
  });
  const disable = useMutation({
    mutationFn: () => disablePush(token!, push.subscriptionId, launchPath),
    onSuccess: save,
  });

  return {
    busy: enable.isPending || disable.isPending,
    error: toggleError(t, enable, disable, push.synchronizationFailed),
    toggle: () => (push.enabled ? disable.mutate() : enable.mutate()),
  };
}

function toggleError(
  t: TFunction<'notifications'>,
  enable: { isError: boolean; data?: PushRegistration },
  disable: { isError: boolean },
  synchronizationFailed: boolean,
): string | null {
  if (enable.data?.permission === 'denied') return t(($) => $.errors.denied);
  if (enable.isError) return t(($) => $.errors.enable);
  if (disable.isError) return t(($) => $.errors.disable);
  if (synchronizationFailed) return t(($) => $.errors.synchronize);
  return null;
}
