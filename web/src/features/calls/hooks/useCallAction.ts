import { useCallStore } from '../store/call-store';
import { useActiveCall } from './useActiveCall';
import { useJoinCall } from './useJoinCall';
import { useStartCall } from './useStartCall';

export interface CallAction {
  onClick: () => void;
  pending: boolean;
  /** The active call session in the store belongs to this channel. */
  inCall: boolean;
  /** The active call session in the store belongs to a different channel. */
  busy: boolean;
  /** A call is already ringing or active here; the action joins it rather than starting one. */
  joinable: boolean;
  /** This channel's own call is running collapsed to the mini bar. */
  minimized: boolean;
}

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
  const session = useCallStore((state) => state.active);
  const minimized = useCallStore((state) => state.minimized);
  const restore = useCallStore((state) => state.restore);
  const startCall = useStartCall(workspaceId, channelId, title, calleeAvatarPath);
  const joinCall = useJoinCall(workspaceId, channelId, title, calleeAvatarPath);

  const inCall = session?.channelId === channelId;
  const busy = Boolean(session) && !inCall;
  const joinable = Boolean(activeCall.data) && !inCall;

  function onClick() {
    if (inCall) {
      if (minimized) restore();
      return;
    }
    if (busy) return;
    if (activeCall.data) joinCall.mutate(activeCall.data.id);
    else startCall.mutate();
  }

  return {
    onClick,
    pending: startCall.isPending || joinCall.isPending,
    inCall,
    busy,
    joinable,
    minimized: inCall && minimized,
  };
}
