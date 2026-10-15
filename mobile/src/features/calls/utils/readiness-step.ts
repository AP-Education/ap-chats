import type { CallReadiness } from '../../../../modules/call-readiness';

export type ReadinessStep = 'fullScreen' | 'background';

/** What to ask for next so a call can wake the phone; nothing once it is allowed or put off. */
export function nextReadinessStep(readiness: CallReadiness, putOff: boolean): ReadinessStep | null {
  if (putOff) return null;
  if (!readiness.fullScreen) return 'fullScreen';
  if (!readiness.background) return 'background';
  return null;
}
