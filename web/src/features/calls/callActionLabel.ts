import type { CallAction } from './hooks/useCallAction';

/** The shared busy/in-call/joinable phrasing for a call action button, whatever it targets. */
export function callActionLabel(call: CallAction, target: string): string {
  if (call.inCall) return call.minimized ? 'Повернутися до дзвінка' : 'Ви в дзвінку';
  if (call.busy) return 'Ви вже у дзвінку';
  if (call.joinable) return 'Приєднатися до дзвінка';
  return target;
}
