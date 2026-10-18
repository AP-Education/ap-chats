import type { CallCheck } from '../../../../modules/call-readiness';

/** What the gate asks for before the app opens: without them a call can't wake the phone. */
const GATED = ['fullScreen', 'unrestricted'] as const;

export type ReadinessStep = (typeof GATED)[number];

/** What to ask for next so a call can wake the phone; nothing once it is allowed or put off. */
export function nextReadinessStep(checks: CallCheck[], putOff: boolean): ReadinessStep | null {
  if (putOff) return null;

  const missing = new Set(checks.filter((check) => !check.ok).map((check) => check.id));
  return GATED.find((step) => missing.has(step)) ?? null;
}
