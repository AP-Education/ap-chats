import type { ActiveCallSession } from '../store/call-store';
import { playBusyTone } from './busyTone';
import { playLeaveChime } from './callChimes';

export type CallEndOutcome = 'ended' | 'declined';

// The room dropping and the server's signal both report the same ending, in either order.
const announced = new WeakSet<ActiveCallSession>();

export function announceCallEnd(session: ActiveCallSession, outcome: CallEndOutcome): void {
  if (announced.has(session)) return;
  announced.add(session);

  if (outcome === 'declined') playBusyTone();
  else playLeaveChime();
}
