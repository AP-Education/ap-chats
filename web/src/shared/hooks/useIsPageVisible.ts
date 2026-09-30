import { useSyncExternalStore } from 'react';

/** A synchronous, one-off read — for an imperative check inside a callback, not a render. */
export function isPageVisible(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

function subscribe(onChange: () => void) {
  window.addEventListener('focus', onChange);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    window.removeEventListener('focus', onChange);
    document.removeEventListener('visibilitychange', onChange);
  };
}

/** Reactive form of `isPageVisible`: re-renders (and re-runs dependent effects) on focus/visibility change. */
export function useIsPageVisible(): boolean {
  return useSyncExternalStore(subscribe, isPageVisible, () => true);
}
