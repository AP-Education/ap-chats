import { useEffect } from 'react';

import { answerCall } from '../utils/answer-call';
import { loadCallKitModule } from '../utils/callkit-module';
import { endCallSession } from '../utils/end-call';
import { hydrateCallSession, restoreIncomingSession } from '../utils/hydrate-call-session';
import { setCallMuted } from '../utils/mute-call';
import { synchronizeCallSession } from '../utils/synchronize-call-session';

/** Wires CallKit/Telecom's lifecycle events to the same REST endpoints and
 * LiveKit room the web app's calls feature uses. Mount once near the app root,
 * same as PushRegistration — a VoIP push can answer/end a call at any time, so
 * this needs to stay subscribed for the app's entire lifetime. */
export function CallSession() {
  useEffect(() => {
    let cancelled = false;
    let subscriptions: { remove(): void }[] = [];

    void (async () => {
      const CallKit = await loadCallKitModule();
      if (!CallKit || cancelled) return;
      const { registerGlobals } = await import('@livekit/react-native');
      if (cancelled) return;

      registerGlobals({ autoConfigureAudioSession: false });

      subscriptions = [
        CallKit.addCallSessionAddedListener((event) => restoreIncomingSession(event.session)),
        CallKit.addIncomingCallReportedListener(() => {
          void hydrateCallSession(CallKit).catch(() => undefined);
        }),
        CallKit.addCallAnsweredListener((event) => void answerCall(event, CallKit)),
        CallKit.addCallEndedListener((event) => void endCallSession(event)),
        CallKit.addReportedCallEndedListener(
          (event) => void endCallSession(event, { notifyServer: false }),
        ),
        CallKit.addCallSessionRemovedListener(
          (event) => void endCallSession(event, { notifyServer: false }),
        ),
        CallKit.addSetMutedActionListener((event) => void setCallMuted(event, CallKit)),
      ];
      await hydrateCallSession(CallKit);
      await synchronizeCallSession(CallKit);
    })().catch((error: unknown) => {
      if (__DEV__) console.warn('[calls] session initialization failed', error);
    });

    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  return null;
}
