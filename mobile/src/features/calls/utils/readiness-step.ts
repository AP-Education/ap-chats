import type { CallCheck } from '../../../../modules/call-readiness';

/** What the gate asks for before the app opens: without them a call can't wake the phone. */
const GATED = ['fullScreen', 'unrestricted'] as const;

export type ReadinessStep = (typeof GATED)[number];

export interface ReadinessPrompt {
  /** The person chose «Пізніше». */
  putOff: boolean;
  /** A call rang while the phone slept and could not light its screen. */
  rangInTheDark: boolean;
}

/**
 * What to ask for next so a call can wake the phone. Put off, the gate asks again only for the
 * full screen, and only once a call has rung without it.
 */
export function nextReadinessStep(
  checks: CallCheck[],
  { putOff, rangInTheDark }: ReadinessPrompt,
): ReadinessStep | null {
  const missing = new Set(checks.filter((check) => !check.ok).map((check) => check.id));
  if (!putOff) return GATED.find((step) => missing.has(step)) ?? null;

  return rangInTheDark && missing.has('fullScreen') ? 'fullScreen' : null;
}
