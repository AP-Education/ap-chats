import { activeCall, CallsApiError } from '../api/calls-api';
import { useNativeCallStore } from '../store/native-call-store';
import type { loadCallKitModule } from './callkit-module';
import { requireAccessToken } from './require-access-token';
import { getTrackedSession } from './session-registry';

export async function synchronizeCallSession(
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
): Promise<void> {
  const current = useNativeCallStore.getState().call;
  if (!current) return;
  const session = getTrackedSession(current.sessionId);
  if (!session) return;
  let close: boolean;
  try {
    const active = await activeCall(
      await requireAccessToken(),
      session.metadata.workspaceId,
      session.metadata.channelId,
    );
    close =
      !active ||
      active.id !== session.serverCallId ||
      (current.status === 'ringing' && active.status !== 'ringing');
  } catch (error) {
    close = error instanceof CallsApiError && [403, 404].includes(error.status);
  }
  const latest = useNativeCallStore.getState().call;
  if (close && latest?.sessionId === current.sessionId && latest.status === current.status)
    await CallKit.endCall(current.sessionId);
}
