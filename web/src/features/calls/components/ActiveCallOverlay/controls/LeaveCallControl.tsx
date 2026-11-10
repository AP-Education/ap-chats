import { useDisconnectButton } from '@livekit/components-react';
import { useTranslation } from 'react-i18next';

import { EndCallIcon } from '../../../callIcons';
import { CallActionButton } from '../../CallActionButton/CallActionButton';
import type { CallControlSize } from './TrackToggleControl';

export function LeaveCallControl({ size, iconSize }: CallControlSize) {
  const { t } = useTranslation('calls');
  const leave = useDisconnectButton({});

  return (
    <CallActionButton
      size={size}
      tone="danger"
      wide
      {...leave.buttonProps}
      aria-label={t(($) => $.overlay.endCall)}
    >
      <EndCallIcon size={iconSize} weight="fill" />
    </CallActionButton>
  );
}
