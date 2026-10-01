import { useEffect } from 'react';

import { useNativeCallStore } from '../store/native-call-store';
import { answerCall } from '../utils/answer-call';
import { extractCallMetadata } from '../utils/call-metadata';
import { loadCallKitModule } from '../utils/callkit-module';
import { endCallSession } from '../utils/end-call';
import { setCallMuted } from '../utils/mute-call';
import { trackSession } from '../utils/session-registry';

/** Wires CallKit/Telecom's lifecycle events to the same REST endpoints and
 * LiveKit room the web app's calls feature uses. Mount once near the app root,
 * same as PushRegistration — a VoIP push can answer/end a call at any time, so
 * this needs to stay subscribed for the app's entire lifetime. */
export function CallSession() {
  useEffect(() => {
    let cancelled = false;
    let subscriptions: { remove(): void }[] = [];

    void (async () => {
      const [CallKit, { registerGlobals }] = await Promise.all([
        loadCallKitModule(),
        import('@livekit/react-native'),
      ]);
      if (!CallKit || cancelled) return;

      try {
        registerGlobals();
      } catch (error) {
        if (__DEV__) console.warn('[calls] registerGlobals() failed', error);
      }

      subscriptions = [
        CallKit.addCallSessionAddedListener((event) => {
          const metadata = extractCallMetadata(event);
          const incoming = event.session.incomingCallEvent;
          // An outgoing (app- or system-initiated) session has no incomingCallEvent to
          // read metadata off — connectBridgedCall tracks those itself, synchronously,
          // with what it already has from the WebView bridge message.
          if (!metadata || !incoming) return;
          trackSession(event.session.id, {
            serverCallId: incoming.serverCallId,
            metadata,
            caller: incoming.caller,
          });
          // Mounts NativeIncomingCallScreen immediately — same call session the
          // system's own incoming-call UI is showing, so whichever one the person
          // actually sees (did they open the app, or tap the system notification?)
          // reflects the same ringing state and answers/declines the same way.
          useNativeCallStore
            .getState()
            .setCall({
              sessionId: event.session.id,
              caller: incoming.caller,
              status: 'ringing',
              isMuted: false,
            });
        }),
        CallKit.addCallAnsweredListener((event) => void answerCall(event, CallKit)),
        CallKit.addCallEndedListener((event) => void endCallSession(event)),
        CallKit.addSetMutedActionListener((event) => void setCallMuted(event, CallKit)),
      ];
    })();

    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  return null;
}
