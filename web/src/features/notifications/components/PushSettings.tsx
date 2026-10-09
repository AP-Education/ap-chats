import { IconButton, LoadingIcon, useIsMobile } from '@ap-education/ui';
import { BellIcon, BellSlashIcon } from '@phosphor-icons/react';

import { usePushControl } from '../hooks/usePushControl';
import type { PushControl } from '../types';

export function PushSettings() {
  const push = usePushControl();
  const isMobile = useIsMobile();
  if (!push) return null;

  const iconSize = isMobile ? 24 : 20;

  return (
    <IconButton
      size={isMobile ? 44 : 36}
      aria-label="Сповіщення"
      aria-description={push.hint}
      aria-pressed={push.status === 'on'}
      aria-busy={push.busy}
      disabled={push.busy}
      onClick={push.change}
    >
      {push.busy ? (
        <LoadingIcon size={iconSize} />
      ) : (
        <PushIcon status={push.status} size={iconSize} />
      )}
    </IconButton>
  );
}

function PushIcon({ status, size }: { status: PushControl['status']; size: number }) {
  if (status === 'blocked') return <BellSlashIcon size={size} />;

  return <BellIcon size={size} weight={status === 'on' ? 'fill' : 'regular'} />;
}
