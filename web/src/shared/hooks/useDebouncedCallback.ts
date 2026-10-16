import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Debounces a side effect, not a value: the returned function keeps a stable
 * identity (so it's safe as a dependency) and always invokes the latest
 * `callback`, so callers don't need to memoize it themselves.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Args | null>(null);

  // A call still waiting when the component goes away runs at once instead of being lost; a
  // caller that already counts it as made would otherwise never make it.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const args = pending.current;
      pending.current = null;
      if (args) callbackRef.current(...args);
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timer.current) clearTimeout(timer.current);
      pending.current = args;
      timer.current = setTimeout(() => {
        pending.current = null;
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
