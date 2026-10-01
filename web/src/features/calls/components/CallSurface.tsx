import { lazy, Suspense } from 'react';

import { getAppShell } from '@/lib/app-shell';

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

  // The native shell owns ringing and the in-call screen itself (CallKit/Telecom) —
  // rendering this too would double-ring and fight it for the same LiveKit room. The
  // listener above still runs there, keeping the calls tab's history in sync.
  if (getAppShell().kind === 'mobile') return null;

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
