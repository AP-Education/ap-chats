import type { TFunction } from 'i18next';

import type { CallAction } from './types';

/** The shared busy/in-call/joinable phrasing for a call action button, whatever it targets. */
export function callActionLabel(call: CallAction, target: string, t: TFunction<'calls'>): string {
  if (call.inCall) return call.minimized ? t(($) => $.returnToCall) : t(($) => $.inCall);
  if (call.busy) return t(($) => $.alreadyInCall);
  if (call.joinable) return t(($) => $.joinCall);
  return target;
}
