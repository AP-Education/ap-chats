import { useDisconnectButton } from '@livekit/components-react';
import { Tooltip } from 'antd';

import { EndCallIcon } from '../../../callIcons';
import { CallActionButton } from '../../CallActionButton/CallActionButton';
import type { CallControlSize } from './TrackToggleControl';

export function LeaveCallControl({ size, iconSize }: CallControlSize) {
  const leave = useDisconnectButton({});

  return (
    <Tooltip title="Завершити дзвінок">
      <CallActionButton
        size={size}
        tone="danger"
        wide
        {...leave.buttonProps}
        aria-label="Завершити дзвінок"
      >
        <EndCallIcon size={iconSize} weight="fill" />
      </CallActionButton>
    </Tooltip>
  );
}
