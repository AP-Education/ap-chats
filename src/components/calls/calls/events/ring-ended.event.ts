export const RING_ENDED_EVENT = 'calls.ring-ended';

export type RingEndReason = 'answered' | 'declined' | 'cancelled' | 'missed';

/** A ring stopped: every device still ringing for it, app running or not, should stop too. */
export class RingEndedEvent {
  constructor(
    public readonly callId: string,
    public readonly reason: RingEndReason,
    public readonly recipientUserIds: readonly string[],
  ) {}
}
