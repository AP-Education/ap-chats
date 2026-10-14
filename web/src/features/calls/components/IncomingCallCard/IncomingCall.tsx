import { useFreshActiveCall } from '../../hooks/useActiveCall';
import { isStillRinging } from '../../ring';
import type { CallSignal } from '../../schemas';
import { IncomingCallCard } from './IncomingCallCard';

interface IncomingCallProps {
  signal: CallSignal;
}

/**
 * Shows a ring only while the server still has it ringing. The realtime signal usually ends it
 * first; this way a signal lost to a sleeping tab or a dropped socket can't leave it ringing on,
 * since the active call polls while it rings.
 */
export function IncomingCall({ signal }: IncomingCallProps) {
  const live = useFreshActiveCall(signal.workspaceId, signal.channelId);
  const isOver = live !== undefined && !isStillRinging(signal.callId, live);

  return isOver ? null : <IncomingCallCard signal={signal} />;
}
