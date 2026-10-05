import type { CallSessionAddedEvent } from 'expo-callkit-telecom';

import type { CallSignalMetadata } from '../types';

function isCallSignalMetadata(value: unknown): value is CallSignalMetadata {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.workspaceId === 'string' &&
    typeof record.channelId === 'string' &&
    typeof record.channelKind === 'string' &&
    typeof record.roomName === 'string'
  );
}

/** Reads the metadata this app put on the VoIP push's incomingCall event back out,
 * validated rather than blindly cast — same boundary-distrust as callSignalSchema
 * on the web side, since it's untyped `Record<string, unknown>` on the wire. */
export function extractCallMetadata(
  event: Pick<CallSessionAddedEvent, 'session'>,
): CallSignalMetadata | null {
  const metadata = event.session.incomingCallEvent?.metadata;
  return isCallSignalMetadata(metadata) ? metadata : null;
}
