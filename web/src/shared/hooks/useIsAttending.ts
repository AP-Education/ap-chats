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

// Away from a focused window this long, alerts go to the person's other devices instead.
const IDLE_MS = 60_000;
let lastInputAt = Date.now();

if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'pointermove', 'keydown', 'wheel'])
    window.addEventListener(type, () => (lastInputAt = Date.now()), {
      capture: true,
      passive: true,
    });
}

/** Attending and recently active: the app announces new messages itself and the server stays silent. */
export function isPresent(): boolean {
  return isAttending() && Date.now() - lastInputAt < IDLE_MS;
}

/** Reactive form of `isAttending`, for renders and effects. */
export function useIsAttending(): boolean {
  return useSyncExternalStore(subscribe, isAttending, () => true);
}
