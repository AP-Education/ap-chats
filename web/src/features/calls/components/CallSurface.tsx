import { lazy, Suspense } from 'react';

import { useCallSignalListener } from '../hooks/useCallSignalListener';
import { useCallStore } from '../store/call-store';
import { IncomingCallCard } from './IncomingCallCard';

// LiveKit pulls in a heavy media/UI bundle; most sessions never join a call,
// so it's only fetched once one actually starts.
const ActiveCallOverlay = lazy(() =>
  import('./ActiveCallOverlay/ActiveCallOverlay').then((m) => ({ default: m.ActiveCallOverlay })),
);

/** App-wide: an incoming ring or an open call can originate from any conversation. */
export function CallSurface() {
  useCallSignalListener();
  const incoming = useCallStore((state) => state.incoming);
  const active = useCallStore((state) => state.active);

  return (
    <>
      {incoming && !active && <IncomingCallCard signal={incoming} />}
      {active && (
        <Suspense fallback={null}>
          <ActiveCallOverlay session={active} />
        </Suspense>
      )}
    </>
  );
}
