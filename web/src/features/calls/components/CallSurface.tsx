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
  const isMobile = getAppShell().kind === 'mobile';

  // The native shell (CallKit/Telecom) owns ringing on mobile — it's the only thing
  // that can wake the app while backgrounded or killed, and it rings regardless of
  // whether the app happens to be open, so showing this card too would double-ring.
  // `active` is a different story: it's only ever set by this app's own web code
  // (starting a call, or accepting one from this card), meaning the person is already
  // looking at the WebView — so the in-call screen stays the familiar one everywhere,
  // the same way Telegram/Discord hand off from the system call screen to their own
  // UI as soon as the app itself is frontmost.
  return (
    <>
      {incoming && !active && !isMobile && <IncomingCallCard signal={incoming} />}
      {active && (
        <Suspense fallback={null}>
          <ActiveCallOverlay session={active} />
        </Suspense>
      )}
    </>
  );
}
