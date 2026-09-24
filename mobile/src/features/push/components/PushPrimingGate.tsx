import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

import { GateScreen } from '../../../components/GateScreen';
import { hasShownPushPriming, markPushPrimingShown } from '../api/priming-state';
import { getPushPermissionStatus, requestPushPermission } from '../api/push-token';
import { registerCurrentDeviceForPush } from '../api/register-current-device';

/**
 * Own UI before the one-shot OS permission dialog — asking cold, with no context,
 * converts poorly, and the OS won't show that dialog again after a decline. Runs once
 * per install (see priming-state.ts); anyone who already has a permission decision
 * (from a previous priming or an OS-level change) skips straight through.
 */
export function PushPrimingGate({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState<'checking' | boolean>('checking');

  useEffect(() => {
    void (async () => {
      const [shown, status] = await Promise.all([hasShownPushPriming(), getPushPermissionStatus()]);
      setVisible(!shown && status === 'undetermined');
    })();
  }, []);

  async function dismiss() {
    await markPushPrimingShown();
    setVisible(false);
  }

  async function enable() {
    await requestPushPermission();
    await registerCurrentDeviceForPush().catch(() => {});
    await dismiss();
  }

  if (visible === 'checking') {
    return <GateScreen icon="notifications" title="Перевіряємо" loading />;
  }
  if (!visible) return <>{children}</>;

  return (
    <GateScreen
      icon="notifications"
      title="Не пропускай дзвінки та повідомлення"
      description="Дізнавайся про нове одразу, навіть коли застосунок закритий."
      actions={[
        { label: 'Увімкнути сповіщення', onPress: () => void enable() },
        { label: 'Пропустити', onPress: () => void dismiss(), variant: 'secondary' },
      ]}
    />
  );
}
