import { getAppShell, useShellAppearance } from '@ap-education/shell-sdk';
import { AppearanceScope } from '@ap-education/ui';
import { lazy, Suspense } from 'react';

import { useCallSignalListener } from '../hooks/useCallSignalListener';
import { useCallStore } from '../store/call-store';
import { IncomingCallCard } from './IncomingCallCard/IncomingCallCard';

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
  const { accent } = useShellAppearance();

  // The native shell owns the whole call lifecycle on mobile — not just ringing
  // (CallKit/Telecom is the only thing that can wake the app while backgrounded
  // or killed), but the connected call too: the WebView can't reliably capture
  // the microphone (insecure http:// context during local dev, and no WebView
  // media-permission grant configured either way), so useStartCall/useJoinCall
  // hand the join grant to native instead of ever setting `active` here — see
  // NativeCallConnectPayload. NativeInCallScreen is the in-app screen on mobile.
  if (getAppShell().kind === 'mobile') return null;

  // A call reads as its own dark space in either theme, the way native call screens do.
  return (
    <AppearanceScope appearance="dark" accent={accent}>
      {incoming && !active && <IncomingCallCard signal={incoming} />}
      {active && (
        <Suspense fallback={null}>
          <ActiveCallOverlay session={active} />
        </Suspense>
      )}
    </AppearanceScope>
  );
}
