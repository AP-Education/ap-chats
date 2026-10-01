import type { CallParticipant } from 'expo-callkit-telecom';
import type { Room } from 'livekit-client';

import type { CallSignalMetadata } from '../types';

export interface TrackedSession {
  serverCallId: string;
  metadata: CallSignalMetadata;
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
