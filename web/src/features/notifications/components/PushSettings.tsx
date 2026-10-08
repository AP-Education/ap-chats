import { IconButton, useIsMobile } from '@ap-education/ui';
import { BellIcon, BellSlashIcon } from '@phosphor-icons/react';
import { Spin, Tooltip } from 'antd';

import { usePushControl } from '../hooks/usePushControl';
import type { PushControl } from '../types';

export function PushSettings() {
  const push = usePushControl();
  const isMobile = useIsMobile();
  if (!push) return null;

  const iconSize = isMobile ? 24 : 20;

  return (
    <Tooltip title={push.hint}>
      <IconButton
        size={isMobile ? 44 : 36}
        aria-label="Сповіщення"
        aria-description={push.hint}
        aria-pressed={push.status === 'on'}
        aria-busy={push.busy}
        disabled={push.busy}
        onClick={push.change}
      >
        {push.busy ? <Spin size="small" /> : <PushIcon status={push.status} size={iconSize} />}
      </IconButton>
    </Tooltip>
  );
}

function PushIcon({ status, size }: { status: PushControl['status']; size: number }) {
  if (status === 'blocked') return <BellSlashIcon size={size} />;

  return <BellIcon size={size} weight={status === 'on' ? 'fill' : 'regular'} />;
}
