import { useEffect } from 'react';

import { createRingback } from '../sound/ringback';
import { useActiveCall } from './useActiveCall';

/**
 * Plays a ringback for as long as this call is still 'ringing' — which,
 * by construction, only the caller can ever observe from inside the call
 * screen: joining a ringing call activates it server-side before the
 * join grant comes back, so anyone who answers already sees 'active'.
 */
export function useOutgoingRingback(workspaceId: string, channelId: string): void {
  const activeCall = useActiveCall(workspaceId, channelId);
  const ringing = activeCall.data?.status === 'ringing';

  useEffect(() => {
    if (!ringing || typeof AudioContext === 'undefined') return;
    const context = new AudioContext();
    const ringback = createRingback(context);
    void context.resume().then(
      () => ringback.start(),
      () => undefined,
    );

    return () => ringback.stop();
  }, [ringing]);
}
