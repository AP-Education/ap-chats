import { useSyncExternalStore } from 'react';

/** The user is looking at this tab: visible and focused. A synchronous read for callbacks. */
export function isAttending(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

function subscribe(onChange: () => void) {
  window.addEventListener('focus', onChange);
  window.addEventListener('blur', onChange);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    window.removeEventListener('focus', onChange);
    window.removeEventListener('blur', onChange);
    document.removeEventListener('visibilitychange', onChange);
  };
}

/** Reactive form of `isAttending`, for renders and effects. */
export function useIsAttending(): boolean {
  return useSyncExternalStore(subscribe, isAttending, () => true);
}
