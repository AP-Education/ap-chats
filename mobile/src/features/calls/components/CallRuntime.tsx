import { useEffect, useState } from 'react';

import { ErrorBoundary } from '../../../shell/ErrorBoundary';
import { useCallRuntimeStore } from '../store/call-runtime-store';
import { CallSignalSocket } from './CallSignalSocket';
import { ProximityMonitor } from './ProximityMonitor';

/**
 * What a call needs on screen, whichever window is up: the app, or the call window alone over
 * the lock screen. Mounted in both roots, it runs once, in the earliest one.
 */
export function CallRuntime() {
  const [claim] = useState(() => Symbol('call runtime'));
  const runs = useCallRuntimeStore((state) => state.claims[0] === claim);

  useEffect(() => {
    useCallRuntimeStore.getState().claim(claim);
    return () => useCallRuntimeStore.getState().release(claim);
  }, [claim]);

  if (!runs) return null;

  return (
    <>
      <ErrorBoundary label="call-signal-socket">
        <CallSignalSocket />
      </ErrorBoundary>
      <ErrorBoundary label="proximity-monitor">
        <ProximityMonitor />
      </ErrorBoundary>
    </>
  );
}
