import { answerCall } from '../utils/answer-call';
import { syncAudioRoute } from '../utils/audio-route';
import { loadCallKitModule } from '../utils/callkit-module';
import { dropRingWithoutSession } from '../utils/drop-ring-without-session';
import { endCallSession } from '../utils/end-call';
import { hydrateCallSession, restoreIncomingSession } from '../utils/hydrate-call-session';
import { setCallMuted } from '../utils/mute-call';
import { noteRingInTheDark } from '../utils/ring-in-the-dark';
import { synchronizeCallSession } from '../utils/synchronize-call-session';

/** Wires CallKit/Telecom's lifecycle events to the same REST endpoints and
 * LiveKit room the web app's calls feature uses. Subscribed as the JS runtime
 * loads, not with any screen: on Android a ring starts the runtime with no
 * screen at all, and an answer or decline from the lock screen still has to
 * reach the server. */
async function listenToCallSessions(): Promise<void> {
  const CallKit = await loadCallKitModule();
  if (!CallKit) return;
  const { registerGlobals } = await import('@livekit/react-native');

  registerGlobals({ autoConfigureAudioSession: false });

  CallKit.addCallSessionAddedListener((event) => restoreIncomingSession(event.session));
  // A push can arrive after the call was already answered, declined or hung up elsewhere.
  CallKit.addIncomingCallReportedListener(() => {
    void noteRingInTheDark(CallKit).catch(() => undefined);
    void dropRingWithoutSession(CallKit)
      .catch(() => undefined)
      .then(() => hydrateCallSession(CallKit))
      .then(() => synchronizeCallSession(CallKit))
      .catch(() => undefined);
  });
  CallKit.addCallAnsweredListener((event) => void answerCall(event, CallKit));
  CallKit.addCallEndedListener((event) => void endCallSession(event));
  CallKit.addReportedCallEndedListener(
    (event) => void endCallSession(event, { notifyServer: false, reason: event.reason }),
  );
  CallKit.addCallSessionRemovedListener(
    (event) => void endCallSession(event, { notifyServer: false }),
  );
  CallKit.addSetMutedActionListener((event) => void setCallMuted(event, CallKit));
  CallKit.addAudioRouteChangedListener((event) =>
    syncAudioRoute(event.currentRoute, event.availableRoutes),
  );

  // A ring that started this runtime came before the listener above was there to hear it.
  void noteRingInTheDark(CallKit).catch(() => undefined);
  await dropRingWithoutSession(CallKit).catch(() => undefined);
  await hydrateCallSession(CallKit);
  await synchronizeCallSession(CallKit);
}

listenToCallSessions().catch((error: unknown) => {
  if (__DEV__) console.warn('[calls] session initialization failed', error);
});
