import type { CallParticipant } from 'expo-callkit-telecom';
import type { Room } from 'livekit-client';

import type { PlacedCall } from './placed-call';

// Only what endCallSession/answerCall actually need to reach the REST API —
// not the full (validated) CallSignalMetadata off the incoming push event,
// since an app-initiated outgoing call has no push event to validate at all.
// CallSignalMetadata is a structural superset, so tracking an incoming
// session still just works without a cast.
export interface TrackedSessionMetadata {
  workspaceId: string;
  channelId: string;
}

export interface TrackedSession {
  serverCallId: string;
  metadata: TrackedSessionMetadata;
  caller: CallParticipant;
  /** A channel call rather than a DM, where people may come and go while it runs. */
  group: boolean;
  abortController: AbortController;
  answerRequestId?: string;
  room?: Room;
  /** Unsubscribes trackRemoteParticipant's room listeners — called once, from
   * endCallSession, alongside the room disconnect itself. */
  stopTrackingRemote?: () => void;
  stopCallCues?: () => void;
  /** Set only on a call this device placed, until someone answers it or it ends. */
  placed?: PlacedCall;
}

// Keyed by the OS-assigned CallSession id — the one thing every
// expo-callkit-telecom lifecycle event carries.
const sessions = new Map<string, TrackedSession>();

export function trackSession(
  sessionId: string,
  session: Omit<TrackedSession, 'abortController'>,
): TrackedSession {
  const tracked = { ...session, abortController: new AbortController() };
  sessions.set(sessionId, tracked);
  return tracked;
}

export function getTrackedSession(sessionId: string): TrackedSession | undefined {
  return sessions.get(sessionId);
}

export function untrackSession(sessionId: string): TrackedSession | undefined {
  const session = sessions.get(sessionId);
  sessions.delete(sessionId);
  session?.abortController.abort();
  return session;
}

/** A call this device placed and still waits on, by the backend's own call id. */
export function findPlacedCall(serverCallId: string): PlacedCall | undefined {
  const sessionId = findTrackedSessionIdByServerCallId(serverCallId);
  return sessionId ? sessions.get(sessionId)?.placed : undefined;
}

/** CallSignalSocket needs the OS session id to address CallKit by, but only
 * ever has the backend's own call id (what the realtime signal carries). */
export function findTrackedSessionIdByServerCallId(serverCallId: string): string | undefined {
  for (const [sessionId, session] of sessions) {
    if (session.serverCallId === serverCallId) return sessionId;
  }
  return undefined;
}
