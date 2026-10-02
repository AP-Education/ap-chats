import { useEffect } from 'react';

import { getSharedAudioContext } from '@/shared/audio/audio-context';

import { createRingback } from '../sound/ringback';
import { useActiveCall } from './useActiveCall';

// 'ringing' is only ever observed here by the caller: joining activates the call server-side before the join grant returns, so anyone who answers already sees 'active'.
export function useOutgoingRingback(workspaceId: string, channelId: string): void {
  const activeCall = useActiveCall(workspaceId, channelId);
  const ringing = activeCall.data?.status === 'ringing';

  useEffect(() => {
    if (!ringing) return;
    const context = getSharedAudioContext();
    if (!context) return;
    let cancelled = false;
    let ringback: ReturnType<typeof createRingback> | undefined;

    void context.resume().then(
      () => {
        if (cancelled) return;
        ringback = createRingback(context);
        ringback.start();
      },
      () => undefined,
    );

    return () => {
      cancelled = true;
      ringback?.stop();
    };
  }, [ringing]);
}
