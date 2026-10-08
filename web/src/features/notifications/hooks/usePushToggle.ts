import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { disablePush, enablePush, type PushRegistration } from '../api/push-subscription';
import { pushRegistrationKey, usePush } from './usePush';

export function usePushToggle() {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const push = usePush();

  const save = (registration: PushRegistration) =>
    queryClient.setQueryData(pushRegistrationKey(identity), registration);
  const enable = useMutation({
    mutationFn: () => enablePush(token!, push.publicKey!),
    onSuccess: save,
  });
  const disable = useMutation({
    mutationFn: () => disablePush(token!, push.subscriptionId),
    onSuccess: save,
  });

  return {
    busy: enable.isPending || disable.isPending,
    error: toggleError(enable, disable, push.synchronizationFailed),
    toggle: () => (push.enabled ? disable.mutate() : enable.mutate()),
  };
}

function toggleError(
  enable: { isError: boolean; data?: PushRegistration },
  disable: { isError: boolean },
  synchronizationFailed: boolean,
): string | null {
  if (enable.data?.permission === 'denied')
    return 'Браузер не дозволив сповіщення. Перевірте дозвіл для цього сайту та загальні налаштування сповіщень браузера.';
  if (enable.isError) return 'Не вдалося ввімкнути сповіщення. Спробуйте ще раз.';
  if (disable.isError) return 'Не вдалося вимкнути сповіщення. Спробуйте ще раз.';
  if (synchronizationFailed)
    return 'Не вдалося оновити підписку. Повторимо після відновлення з’єднання.';
  return null;
}
