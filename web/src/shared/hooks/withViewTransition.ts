import { flushSync } from 'react-dom';

/**
 * Runs a state update inside the browser's View Transitions API, so a DOM
 * change (elements sharing a `view-transition-name`, in particular) morphs
 * instead of swapping instantly. React's own `<ViewTransition>` isn't in this
 * project's React channel yet (canary/experimental only), so this reaches
 * `document.startViewTransition` directly, wrapping the update in `flushSync`
 * since the API needs the DOM already mutated when its callback returns.
 * Falls back to a plain update where the API isn't supported (Firefox,
 * older Safari).
 */
export function withViewTransition(update: () => void): void {
  if (typeof document === 'undefined' || !document.startViewTransition) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}
