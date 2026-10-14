import { useEffect, useState } from 'react';

import type { CallSignal } from '../schemas';
import { useCallStore } from '../store/call-store';
import { useActiveCall } from './useActiveCall';

/**
 * Drops a ring as soon as the server no longer has it ringing: answered or declined on another
 * device, hung up, or missed. The realtime signal usually says so first; this also catches a
 * signal lost to a sleeping tab or a dropped socket, since the active call polls while ringing.
 */
export function useRingResolution(signal: CallSignal): void {
  const [shownAt] = useState(Date.now);
  const live = useActiveCall(signal.workspaceId, signal.channelId);
  const clearIncoming = useCallStore((state) => state.clearIncoming);
  const isCurrent = live.dataUpdatedAt >= shownAt;
  const stillRinging = live.data?.id === signal.callId && live.data.status === 'ringing';
  const resolved = live.isSuccess && isCurrent && !stillRinging;

  useEffect(() => {
    if (resolved) clearIncoming(signal.callId);
  }, [resolved, clearIncoming, signal.callId]);
}
