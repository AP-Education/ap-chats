import { BellIcon } from '@phosphor-icons/react';
import { Spin, Tooltip } from 'antd';

import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { IconButton } from '@/shared/ui/IconButton';

import { usePush } from '../hooks/usePush';
import { usePushToggle } from '../hooks/usePushToggle';

export function PushSettings() {
  const push = usePush();
  const toggle = usePushToggle();
  const isMobile = useIsMobile();
  if (!push.available) return null;

  const label = push.enabled ? 'Вимкнути сповіщення' : 'Увімкнути сповіщення';
  const help =
    toggle.error ??
    (push.permission === 'default' ? 'Натисніть, щоб браузер запитав дозвіл на сповіщення' : label);

  return (
    <Tooltip title={help}>
      <IconButton
        size={isMobile ? 44 : 36}
        aria-label={label}
        aria-pressed={push.enabled}
        aria-busy={toggle.busy}
        disabled={toggle.busy}
        onClick={toggle.toggle}
      >
        {toggle.busy ? (
          <Spin size="small" />
        ) : (
          <BellIcon size={isMobile ? 24 : 20} weight={push.enabled ? 'fill' : 'regular'} />
        )}
      </IconButton>
    </Tooltip>
  );
}
