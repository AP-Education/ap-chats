import type { CallParticipant } from 'expo-callkit-telecom';
import type { Room } from 'livekit-client';

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
  room?: Room;
}

// Keyed by the OS-assigned CallSession id — the one thing every
// expo-callkit-telecom lifecycle event carries.
const sessions = new Map<string, TrackedSession>();

export function trackSession(sessionId: string, session: TrackedSession): void {
  sessions.set(sessionId, session);
}

export function getTrackedSession(sessionId: string): TrackedSession | undefined {
  return sessions.get(sessionId);
}

export function untrackSession(sessionId: string): TrackedSession | undefined {
  const session = sessions.get(sessionId);
  sessions.delete(sessionId);
  return session;
}
