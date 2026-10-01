import type { CallAction } from '../types';
import { useActiveCall } from './useActiveCall';
import { useKnownCallAction } from './useKnownCallAction';

/**
 * Starts this channel's call, joins one already ringing or active, or — if this
 * channel's own call is merely minimized — brings it back to the foreground.
 */
export function useCallAction(
  workspaceId: string,
  channelId: string,
  title: string,
  calleeAvatarPath?: string | null,
): CallAction {
  const activeCall = useActiveCall(workspaceId, channelId);
  return useKnownCallAction(workspaceId, channelId, title, calleeAvatarPath, activeCall.data);
}
