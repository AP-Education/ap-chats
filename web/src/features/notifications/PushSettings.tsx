import { BellIcon } from '@phosphor-icons/react';
import { Spin, Tooltip } from 'antd';

import { useWebPush } from '@/features/devices/browser-push';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { IconButton } from '@/shared/ui/IconButton';

export function PushSettings() {
  const push = useWebPush();
  const isMobile = useIsMobile();
  if (!push.available) return null;

  const label = push.enabled ? 'Вимкнути сповіщення' : 'Увімкнути сповіщення';
  const help =
    push.error ??
    (push.permission === 'default' ? 'Натисніть, щоб браузер запитав дозвіл на сповіщення' : label);

  function togglePush() {
    if (push.enabled) {
      void push.disable();
      return;
    }

    void push.enable();
  }

  return (
    <Tooltip title={help}>
      <IconButton
        size={isMobile ? 44 : 36}
        aria-label={label}
        aria-pressed={push.enabled}
        aria-busy={push.busy}
        disabled={push.busy}
        onClick={togglePush}
      >
        {push.busy ? (
          <Spin size="small" />
        ) : (
          <BellIcon size={isMobile ? 24 : 20} weight={push.enabled ? 'fill' : 'regular'} />
        )}
      </IconButton>
    </Tooltip>
  );
}
