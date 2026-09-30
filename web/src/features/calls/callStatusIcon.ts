import { PhoneIcon, PhoneIncomingIcon, PhoneOutgoingIcon, PhoneXIcon } from '@phosphor-icons/react';

import type { CallStatus } from './api/calls-api';

export type CallStatusTone = 'live' | 'missed' | 'neutral';

/** The call-status -> icon/tone rule, shared by the channel timeline's
 * CallLogRow and the calls tab's history rows so both read a call the same way. */
export function getCallStatusIcon(status: CallStatus, outgoing: boolean) {
  const live = status === 'ringing' || status === 'active';
  const missed = status === 'missed' || status === 'declined';
  const tone: CallStatusTone = live ? 'live' : missed ? 'missed' : 'neutral';
  const Icon = live
    ? PhoneIcon
    : missed
      ? PhoneXIcon
      : outgoing
        ? PhoneOutgoingIcon
        : PhoneIncomingIcon;
  return { Icon, tone, live, missed };
}
