import { BellIcon } from '@phosphor-icons/react';
import { Button, Tooltip } from 'antd';

import { useWebPush } from '@/features/devices/browser-push';

export function PushSettings() {
  const push = useWebPush();
  if (!push.available) return null;

  const label = push.enabled ? 'Вимкнути push-сповіщення' : 'Увімкнути push-сповіщення';
  const help = push.denied
    ? 'Дозвольте сповіщення в налаштуваннях браузера'
    : (push.error ?? label);

  function togglePush() {
    if (push.enabled) {
      void push.disable();
      return;
    }

    void push.enable();
  }

  return (
    <Tooltip title={help}>
      <Button
        type="text"
        aria-label={label}
        icon={<BellIcon weight={push.enabled ? 'fill' : 'regular'} />}
        loading={push.busy}
        disabled={push.denied}
        onClick={togglePush}
      />
    </Tooltip>
  );
}
