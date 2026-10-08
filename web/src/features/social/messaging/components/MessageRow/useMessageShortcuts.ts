import type { KeyboardEvent } from 'react';

import { useMessageActionScope } from './MessageActionScope';

// A focused message answers to the same letters as its menu.
const SHORTCUTS: Record<string, string> = { r: 'reply', e: 'edit' };

/** Keyboard shortcuts on a focused message row. */
export function useMessageShortcuts() {
  const scope = useMessageActionScope();

  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.defaultPrevented) return;
    const actionId = SHORTCUTS[event.key.toLowerCase()];
    if (!actionId) return;

    const action = scope.action(actionId);
    if (action?.available(scope.messageTarget, scope.context))
      scope.onAction(action, scope.messageTarget);
  };
}
