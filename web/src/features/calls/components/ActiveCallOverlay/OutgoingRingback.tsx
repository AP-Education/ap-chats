import { useRemoteParticipants } from '@livekit/components-react';
import { useEffect } from 'react';

import { useFreshActiveCall } from '../../hooks/useActiveCall';
import { isStillRinging, remainingRingMs } from '../../ring';
import { playRingback } from '../../sound/ringback';
import type { ActiveCallSession } from '../../store/call-store';

interface OutgoingRingbackProps {
  session: ActiveCallSession;
}

/**
 * Rings back while the call still rings for the others: nobody else is in the room, which stops
 * it the moment someone answers, and the server still has it ringing, which stops it once declined,
 * hung up or missed. The ringback itself ends at the ring's deadline. Anyone joining activates the
 * call first, so only the caller ever hears it.
 */
export function OutgoingRingback({ session }: OutgoingRingbackProps) {
  const isAlone = useRemoteParticipants().length === 0;
  const live = useFreshActiveCall(session.workspaceId, session.channelId);
  const ringsBack = isAlone && isStillRinging(session.callId, live);

  useEffect(() => {
    if (!ringsBack) return;
    return playRingback(remainingRingMs(session.startedAt) / 1000);
  }, [ringsBack, session.startedAt]);

  return null;
}
